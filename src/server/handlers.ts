/**
 * Every backend endpoint. The paths match the API contract in README.md, under /api.
 * All three portals read and write the same database, so they're connected:
 *   student registers / uploads a slip  → admin sees it in Pending Payments
 *   admin approves                      → student's QR pass appears
 *   enforcer adds a fee                 → student sees it under Pay Unregistered Fee
 *   enforcer scans / adds fees          → admin sees it in that enforcer's activity
 */
import "server-only";
import { randomUUID } from "node:crypto";
import type { Fee, Payment, Student } from "@/lib/types";
import { checkPassword, checkSlipLink, hashPassword, requireRole, signToken, slipUrl } from "./auth";
import { db, ready, todaySql, type Q } from "./db";
import { bad, conflict, HttpError, json, notFound, readForm, readJson, str } from "./http";

const PASS_PRICE = 1500;
const MAX_SLIP_BYTES = 4 * 1024 * 1024; // Vercel limits request bodies to ~4.5 MB
const VEHICLE_TYPES = ["Car", "Motorbike", "Van", "Three-wheeler", "Other"];

/* ───────────────────────── row → API shape ───────────────────────── */

type StudentRow = {
  id: string;
  full_name: string;
  contact: string;
  vehicle_number: string;
  vehicle_type: Student["vehicleType"];
  pass_status: string;
  pass_valid_until: string | null;
  qr_token: string | null;
  expired: boolean;
};

const STUDENT_COLS = (sql: Q) => sql`
  id, full_name, contact, vehicle_number, vehicle_type, pass_status, qr_token,
  pass_valid_until::text as pass_valid_until,
  (pass_status = 'active' and (pass_valid_until is null or pass_valid_until < ${todaySql(sql)})) as expired`;

function toStudent(r: StudentRow): Student {
  const status = r.expired ? "expired" : (r.pass_status as Student["passStatus"]);
  return {
    id: r.id,
    fullName: r.full_name,
    contact: r.contact,
    vehicleNumber: r.vehicle_number,
    vehicleType: r.vehicle_type,
    passStatus: status,
    passValidUntil: r.pass_valid_until,
    qrToken: status === "active" ? r.qr_token : null, // no QR to show unless the pass is valid
  };
}

type PaymentRow = {
  id: string;
  student_id: string;
  kind: Payment["kind"];
  amount: number;
  date: string;
  status: Payment["status"];
  slip_id: string | null;
  fee_id: string | null;
};
const PAYMENT_COLS = (sql: Q) => sql`id, student_id, kind, amount, date::text as date, status, slip_id::text as slip_id, fee_id`;
const toPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  studentId: r.student_id,
  kind: r.kind,
  amount: r.amount,
  date: r.date,
  status: r.status,
  slipUrl: slipUrl(r.slip_id),
  feeId: r.fee_id,
});

type FeeRow = { id: string; student_id: string; vehicle_number: string; hours: number; amount: number; date: string; status: Fee["status"]; issued_by: string };
const FEE_COLS = (sql: Q) => sql`id, student_id, vehicle_number, hours, amount, date::text as date, status, issued_by`;
const toFee = (r: FeeRow): Fee => ({
  id: r.id,
  studentId: r.student_id,
  vehicleNumber: r.vehicle_number,
  hours: r.hours,
  amount: r.amount,
  date: r.date,
  status: r.status,
  issuedBy: r.issued_by,
});

async function findStudent(q: string) {
  const sql = db();
  const needle = q.trim();
  if (!needle) return null;
  const [row] = await sql<StudentRow[]>`
    select ${STUDENT_COLS(sql)} from students
    where qr_token = ${needle}
       or upper(id) = upper(${needle})
       or upper(replace(vehicle_number, ' ', '')) = upper(replace(${needle}, ' ', ''))
    limit 1`;
  return row ?? null;
}

async function unpaidFees(studentId: string) {
  const sql = db();
  const rows = await sql<FeeRow[]>`select ${FEE_COLS(sql)} from fees where student_id = ${studentId} and status = 'unpaid' order by date desc`;
  return rows.map(toFee);
}

/** Saves an uploaded slip file and returns its ID. */
async function saveSlip(sql: Q, file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("image/") && mime !== "application/pdf") throw bad("The payment slip must be an image or a PDF.");
  if (file.size > MAX_SLIP_BYTES) throw bad("The payment slip is too large. Please upload a file under 4 MB.");
  const data = Buffer.from(await file.arrayBuffer());
  const [row] = await sql<{ id: string }[]>`insert into slips (mime, data) values (${mime}, ${data}) returning id::text as id`;
  return row.id;
}

/* ───────────────────────── auth ───────────────────────── */

async function studentLogin(req: Request) {
  const { id, password } = await readJson<{ id?: string; password?: string }>(req);
  const sql = db();
  const [row] = await sql<{ id: string; password_hash: string }[]>`select id, password_hash from students where upper(id) = upper(${str(id)})`;
  if (!row || !(await checkPassword(String(password ?? ""), row.password_hash))) throw new HttpError(401, "Incorrect IT number or password.");
  return json({ token: await signToken("student", row.id), userId: row.id });
}

async function studentRegister(req: Request) {
  const form = await readForm(req);
  const id = str(form.get("id")).toUpperCase();
  const fullName = str(form.get("fullName"));
  const contact = str(form.get("contact")).replace(/\s/g, "");
  const vehicleNumber = str(form.get("vehicleNumber")).toUpperCase();
  const vehicleType = str(form.get("vehicleType"));
  const password = String(form.get("password") ?? "");

  if (!/^IT\d{8}$/.test(id)) throw bad("IT number should look like IT26123567.");
  if (!fullName) throw bad("Enter your full name.");
  if (!/^0\d{9}$/.test(contact)) throw bad("Contact number should be 10 digits, e.g. 0771234567.");
  if (!vehicleNumber) throw bad("Enter your vehicle number.");
  if (!VEHICLE_TYPES.includes(vehicleType)) throw bad("Choose a vehicle type.");
  if (password.length < 6) throw bad("Password must be at least 6 characters.");

  const hash = await hashPassword(password);
  const sql = db();
  await sql.begin(async (sql) => {
    const [exists] = await sql`select 1 from students where id = ${id}`;
    if (exists) throw conflict("This IT number is already registered.");
    const [taken] = await sql`select 1 from students where upper(replace(vehicle_number, ' ', '')) = ${vehicleNumber.replace(/\s/g, "")}`;
    if (taken) throw conflict("This vehicle number is already registered to another student.");
    await sql`
      insert into students (id, full_name, contact, vehicle_number, vehicle_type, password_hash, pass_status)
      values (${id}, ${fullName}, ${contact}, ${vehicleNumber}, ${vehicleType}, ${hash}, 'pending')`;
    // With a slip: it waits in the admin's Pending Payments. Without: the student has an account but no pass.
    const slipId = await saveSlip(sql, form.get("paymentSlip"));
    if (slipId) {
      await sql`
        insert into payments (student_id, kind, amount, date, status, slip_id)
        values (${id}, 'pass', ${PASS_PRICE}, ${todaySql(sql)}, 'pending', ${slipId})`;
    }
  });
  return json({ ok: true }, 201);
}

async function enforcerLogin(req: Request) {
  const { id, password } = await readJson<{ id?: string; password?: string }>(req);
  const sql = db();
  const [row] = await sql<{ id: string; password_hash: string }[]>`select id, password_hash from enforcers where upper(id) = upper(${str(id)})`;
  if (!row || !(await checkPassword(String(password ?? ""), row.password_hash))) throw new HttpError(401, "Incorrect enforcer ID or password.");
  return json({ token: await signToken("enforcer", row.id), userId: row.id });
}

async function adminLogin(req: Request) {
  const { password } = await readJson<{ password?: string }>(req);
  if (!process.env.ADMIN_PASSWORD) {
    throw new HttpError(503, "The admin password hasn't been set. Add ADMIN_PASSWORD in Vercel → Settings → Environment Variables and redeploy.");
  }
  const sql = db();
  const admins = await sql<{ id: string; password_hash: string }[]>`select id, password_hash from admins`;
  for (const a of admins) {
    if (await checkPassword(String(password ?? ""), a.password_hash)) return json({ token: await signToken("admin", a.id), userId: a.id });
  }
  throw new HttpError(401, "Incorrect password.");
}

/* ───────────────────────── student ───────────────────────── */

async function studentMe(req: Request) {
  const id = await requireRole(req, "student");
  const sql = db();
  const [row] = await sql<StudentRow[]>`select ${STUDENT_COLS(sql)} from students where id = ${id}`;
  if (!row) throw new HttpError(401, "Account not found. Please log in again.");
  return json(toStudent(row));
}

async function studentPayments(req: Request) {
  const id = await requireRole(req, "student");
  const sql = db();
  const rows = await sql<PaymentRow[]>`select ${PAYMENT_COLS(sql)} from payments where student_id = ${id} order by date desc, created_at desc`;
  return json(rows.map(toPayment));
}

async function studentFees(req: Request) {
  const id = await requireRole(req, "student");
  const sql = db();
  const rows = await sql<FeeRow[]>`select ${FEE_COLS(sql)} from fees where student_id = ${id} order by date desc, created_at desc`;
  return json(rows.map(toFee));
}

async function submitPayment(req: Request) {
  const id = await requireRole(req, "student");
  const form = await readForm(req);
  const kind = str(form.get("kind"));
  const feeId = str(form.get("feeId")) || null;
  if (kind !== "pass" && kind !== "fee") throw bad("Unknown payment type.");
  const file = form.get("slip");
  if (!(file instanceof File) || file.size === 0) throw bad("Upload your bank slip.");

  const sql = db();
  const payment = await sql.begin(async (sql) => {
    const [s] = await sql<StudentRow[]>`select ${STUDENT_COLS(sql)} from students where id = ${id} for update`;
    if (!s) throw new HttpError(401, "Account not found.");
    let amount: number;
    if (kind === "pass") {
      if (toStudent(s).passStatus === "active") throw conflict("Your parking pass is already valid.");
      const [waiting] = await sql`select 1 from payments where student_id = ${id} and kind = 'pass' and status = 'pending'`;
      if (waiting) throw conflict("Your pass payment slip is already waiting for approval.");
      amount = PASS_PRICE;
    } else {
      if (!feeId) throw bad("Choose the fee you're paying.");
      const [fee] = await sql<FeeRow[]>`select ${FEE_COLS(sql)} from fees where id = ${feeId} and student_id = ${id} for update`;
      if (!fee) throw notFound("That fee wasn't found.");
      if (fee.status !== "unpaid") throw conflict("That fee is already paid or waiting for approval.");
      amount = fee.amount; // the server decides the amount, not the browser
      await sql`update fees set status = 'pending' where id = ${feeId}`;
    }
    const slipId = await saveSlip(sql, file);
    const [row] = await sql<PaymentRow[]>`
      insert into payments (student_id, kind, amount, date, status, slip_id, fee_id)
      values (${id}, ${kind}, ${amount}, ${todaySql(sql)}, 'pending', ${slipId}, ${kind === "fee" ? feeId : null})
      returning ${PAYMENT_COLS(sql)}`;
    return row;
  });
  return json(toPayment(payment), 201);
}

/* ───────────────────────── enforcer ───────────────────────── */

async function enforcerMe(req: Request) {
  const id = await requireRole(req, "enforcer");
  const sql = db();
  const [row] = await sql<{ id: string; full_name: string }[]>`select id, full_name from enforcers where id = ${id}`;
  if (!row) throw new HttpError(401, "Account not found. Please log in again.");
  return json({ id: row.id, fullName: row.full_name });
}

async function lookup(req: Request, url: URL) {
  const enforcerId = await requireRole(req, "enforcer");
  const q = str(url.searchParams.get("q"));
  const via = url.searchParams.get("via");
  if (!q) throw bad("Scan a QR code or type an ID / vehicle number.");
  const row = await findStudent(q);
  if (via === "scan" || via === "search") {
    const sql = db();
    await sql`insert into enforcer_activity (enforcer_id, action, query, student_id) values (${enforcerId}, ${via}, ${q.slice(0, 120)}, ${row?.id ?? null})`;
  }
  if (!row) throw notFound("No student found for that QR, ID or vehicle number.");
  return json({ student: toStudent(row), overdueFees: await unpaidFees(row.id) });
}

async function issueFee(req: Request) {
  const enforcerId = await requireRole(req, "enforcer");
  const { studentId, hours, amount } = await readJson<{ studentId?: string; hours?: number; amount?: number }>(req);
  const h = Number(hours);
  const n = Number(amount);
  if (!Number.isInteger(h) || h < 1 || h > 24) throw bad("Parking period must be a whole number of hours between 1 and 24.");
  if (!Number.isInteger(n) || n <= 0) throw bad("Enter an amount above 0.");

  const sql = db();
  const fee = await sql.begin(async (sql) => {
    const [s] = await sql<StudentRow[]>`select ${STUDENT_COLS(sql)} from students where id = ${str(studentId)}`;
    if (!s) throw notFound("Student not found.");
    if (toStudent(s).passStatus === "active") throw conflict(`${s.full_name} has a valid parking pass, so no parking fee applies.`);
    const [row] = await sql<FeeRow[]>`
      insert into fees (student_id, vehicle_number, hours, amount, date, status, issued_by)
      values (${s.id}, ${s.vehicle_number}, ${h}, ${n}, ${todaySql(sql)}, 'unpaid', ${enforcerId})
      returning ${FEE_COLS(sql)}`;
    await sql`
      insert into enforcer_activity (enforcer_id, action, student_id, fee_id, amount, hours)
      values (${enforcerId}, 'fee', ${s.id}, ${row.id}, ${n}, ${h})`;
    return row;
  });
  return json(toFee(fee), 201);
}

async function enforcerFees(req: Request, url: URL) {
  const id = await requireRole(req, "enforcer");
  const status = url.searchParams.get("status");
  const sql = db();
  const rows = await sql<FeeRow[]>`
    select ${FEE_COLS(sql)} from fees
    where issued_by = ${id} ${status ? sql`and status = ${status}` : sql``}
    order by date desc, created_at desc`;
  return json(rows.map(toFee));
}

/* ───────────────────────── admin ───────────────────────── */

async function adminMe(req: Request) {
  const id = await requireRole(req, "admin");
  const sql = db();
  const [row] = await sql<{ id: string; full_name: string }[]>`select id, full_name from admins where id = ${id}`;
  if (!row) throw new HttpError(401, "Account not found. Please log in again.");
  return json({ id: row.id, fullName: row.full_name });
}

async function adminPayments(req: Request, url: URL) {
  await requireRole(req, "admin");
  const status = url.searchParams.get("status");
  const kind = url.searchParams.get("kind");
  const studentId = str(url.searchParams.get("studentId")).toUpperCase();
  const sql = db();
  const rows = await sql<PaymentRow[]>`
    select ${PAYMENT_COLS(sql)} from payments
    where true
      ${status ? sql`and status = ${status}` : sql``}
      ${kind ? sql`and kind = ${kind}` : sql``}
      ${studentId ? sql`and student_id like ${"%" + studentId + "%"}` : sql``}
    order by date desc, created_at desc
    limit 500`;
  return json(rows.map(toPayment));
}

async function reviewPayment(req: Request, id: string) {
  const adminId = await requireRole(req, "admin");
  const { status } = await readJson<{ status?: string }>(req);
  if (status !== "approved" && status !== "rejected") throw bad("Status must be approved or rejected.");
  const sql = db();
  const payment = await sql.begin(async (sql) => {
    const [p] = await sql<PaymentRow[]>`select ${PAYMENT_COLS(sql)} from payments where id = ${id} for update`;
    if (!p) throw notFound("Payment not found.");
    if (p.status !== "pending") throw conflict(`This payment was already ${p.status}.`);
    const [row] = await sql<PaymentRow[]>`
      update payments set status = ${status}, reviewed_by = ${adminId}, reviewed_at = now()
      where id = ${id} returning ${PAYMENT_COLS(sql)}`;

    if (p.kind === "pass") {
      if (status === "approved") {
        // New pass, or renewal of an expired one: valid for a year, with a fresh QR token.
        await sql`
          update students set pass_status = 'active',
            pass_valid_until = ${todaySql(sql)} + interval '1 year',
            qr_token = ${randomUUID()}
          where id = ${p.student_id}`;
      } else {
        const [s] = await sql<StudentRow[]>`select ${STUDENT_COLS(sql)} from students where id = ${p.student_id}`;
        if (s && toStudent(s).passStatus !== "active") {
          await sql`update students set pass_status = 'rejected', qr_token = null where id = ${p.student_id}`;
        }
      }
    } else if (p.fee_id) {
      await sql`update fees set status = ${status === "approved" ? "paid" : "unpaid"} where id = ${p.fee_id}`;
    }
    return row;
  });
  return json(toPayment(payment));
}

async function adminStudent(req: Request, q: string) {
  await requireRole(req, "admin");
  const row = await findStudent(q);
  if (!row) throw notFound("No student found for that ID or vehicle number.");
  return json({ student: toStudent(row), overdueFees: await unpaidFees(row.id) });
}

async function adminEnforcers(req: Request) {
  await requireRole(req, "admin");
  const sql = db();
  const rows = await sql<{ id: string; full_name: string; fees_issued: number; fee_total: number; last_active: string | null }[]>`
    select e.id, e.full_name,
      (select count(*)::int from fees f where f.issued_by = e.id) as fees_issued,
      (select coalesce(sum(amount), 0)::int from fees f where f.issued_by = e.id) as fee_total,
      (select max(at)::text from enforcer_activity a where a.enforcer_id = e.id) as last_active
    from enforcers e order by e.id`;
  return json(rows.map((r) => ({ id: r.id, fullName: r.full_name, feesIssued: r.fees_issued, feeTotal: r.fee_total, lastActive: r.last_active })));
}

async function createEnforcer(req: Request) {
  const adminId = await requireRole(req, "admin");
  const body = await readJson<{ id?: string; fullName?: string; password?: string }>(req);
  const id = str(body.id).toUpperCase();
  const fullName = str(body.fullName);
  const password = String(body.password ?? "");
  if (!/^EN\d{4}$/.test(id)) throw bad("Enforcer ID should look like EN0107.");
  if (!fullName) throw bad("Enter the enforcer's full name.");
  if (password.length < 6) throw bad("Password must be at least 6 characters.");
  const sql = db();
  const [exists] = await sql`select 1 from enforcers where id = ${id}`;
  if (exists) throw conflict(`Enforcer ID ${id} is already taken.`);
  await sql`insert into enforcers (id, full_name, password_hash, created_by) values (${id}, ${fullName}, ${await hashPassword(password)}, ${adminId})`;
  return json({ id, fullName }, 201);
}

async function enforcerActivity(req: Request, enforcerId: string) {
  await requireRole(req, "admin");
  const sql = db();
  const [e] = await sql<{ id: string; full_name: string; created_at: string }[]>`
    select id, full_name, created_at::text as created_at from enforcers where id = ${enforcerId}`;
  if (!e) throw notFound("Enforcer not found.");
  const [summary] = await sql<{ scans: number; searches: number; fees: number; fee_total: number; today: number; last_active: string | null }[]>`
    select
      count(*) filter (where action = 'scan')::int   as scans,
      count(*) filter (where action = 'search')::int as searches,
      count(*) filter (where action = 'fee')::int    as fees,
      coalesce(sum(amount) filter (where action = 'fee'), 0)::int as fee_total,
      count(*) filter (where (at at time zone 'Asia/Colombo')::date = ${todaySql(sql)})::int as today,
      max(at)::text as last_active
    from enforcer_activity where enforcer_id = ${enforcerId}`;
  const items = await sql<
    { id: string; action: string; at: string; query: string | null; student_id: string | null; student_name: string | null; vehicle_number: string | null; amount: number | null; hours: number | null; fee_status: string | null }[]
  >`
    select a.id::text as id, a.action, to_char(a.at at time zone 'Asia/Colombo', 'YYYY-MM-DD HH24:MI') as at, a.query,
           a.student_id, s.full_name as student_name, s.vehicle_number, a.amount, a.hours, f.status as fee_status
    from enforcer_activity a
    left join students s on s.id = a.student_id
    left join fees f on f.id = a.fee_id
    where a.enforcer_id = ${enforcerId}
    order by a.at desc
    limit 200`;
  return json({
    enforcer: { id: e.id, fullName: e.full_name, createdAt: e.created_at.slice(0, 10) },
    summary: {
      scans: summary.scans,
      searches: summary.searches,
      fees: summary.fees,
      feeTotal: summary.fee_total,
      today: summary.today,
      lastActive: summary.last_active,
    },
    items: items.map((i) => ({
      id: i.id,
      action: i.action,
      at: i.at,
      query: i.query,
      studentId: i.student_id,
      studentName: i.student_name,
      vehicleNumber: i.vehicle_number,
      amount: i.amount,
      hours: i.hours,
      feeStatus: i.fee_status,
    })),
  });
}

/* ───────────────────────── slips ───────────────────────── */

async function getSlip(id: string, url: URL) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !checkSlipLink(id, url.searchParams.get("exp"), url.searchParams.get("sig"))) {
    throw new HttpError(403, "This slip link has expired. Reload the page to get a new one.");
  }
  const sql = db();
  const [row] = await sql<{ mime: string; data: Buffer }[]>`select mime, data from slips where id = ${id}`;
  if (!row) throw notFound("Slip not found.");
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/* ───────────────────────── router ───────────────────────── */

export async function handle(req: Request, segments: string[]): Promise<Response> {
  const url = new URL(req.url);
  const path = "/" + segments.join("/");
  const m = req.method;
  try {
    if (path === "/health") {
      return json({ ok: true, database: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL), adminPassword: !!process.env.ADMIN_PASSWORD });
    }
    await ready();

    if (m === "POST" && path === "/auth/student/login") return await studentLogin(req);
    if (m === "POST" && path === "/auth/student/register") return await studentRegister(req);
    if (m === "POST" && path === "/auth/enforcer/login") return await enforcerLogin(req);
    if (m === "POST" && path === "/auth/admin/login") return await adminLogin(req);

    if (m === "GET" && path === "/students/me") return await studentMe(req);
    if (m === "GET" && path === "/students/me/payments") return await studentPayments(req);
    if (m === "GET" && path === "/students/me/fees") return await studentFees(req);
    if (m === "POST" && path === "/payments") return await submitPayment(req);

    if (m === "GET" && path === "/enforcers/me") return await enforcerMe(req);
    if (m === "GET" && path === "/students/lookup") return await lookup(req, url);
    if (m === "POST" && path === "/fees") return await issueFee(req);
    if (m === "GET" && path === "/enforcers/me/fees") return await enforcerFees(req, url);

    if (m === "GET" && path === "/admins/me") return await adminMe(req);
    if (m === "GET" && path === "/admin/payments") return await adminPayments(req, url);
    if (m === "PATCH" && segments[0] === "admin" && segments[1] === "payments" && segments.length === 3) return await reviewPayment(req, segments[2]);
    if (m === "GET" && segments[0] === "admin" && segments[1] === "students" && segments.length === 3) return await adminStudent(req, segments[2]);
    if (m === "GET" && path === "/admin/enforcers") return await adminEnforcers(req);
    if (m === "POST" && path === "/admin/enforcers") return await createEnforcer(req);
    if (m === "GET" && segments[0] === "admin" && segments[1] === "enforcers" && segments[3] === "activity" && segments.length === 4)
      return await enforcerActivity(req, segments[2]);

    if (m === "GET" && segments[0] === "slips" && segments.length === 2) return await getSlip(segments[1], url);

    return json({ message: `No endpoint for ${m} ${path}` }, 404);
  } catch (e) {
    if (e instanceof HttpError) return json({ message: e.message }, e.status);
    console.error(`[api] ${m} ${path}`, e);
    return json({ message: "Something went wrong on the server. Please try again." }, 500);
  }
}
