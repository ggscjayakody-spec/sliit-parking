/**
 * In-browser fake backend, used only when NEXT_PUBLIC_API_URL is not set.
 * Data is kept in localStorage so a demo flow works end to end:
 * register → admin approves pass → student sees QR → enforcer scans it.
 *
 * Demo logins:
 *   Student  IT26123567 / password123
 *   Enforcer EN0106     / password123
 *   Admin    ADMIN01    / admin123
 */
import { ApiError } from "./errors";
import { getSession } from "./session";
import type {
  Admin,
  Enforcer,
  Fee,
  FeeStatus,
  LoginResult,
  NewEnforcerInput,
  Payment,
  PaymentKind,
  PaymentStatus,
  RegisterInput,
  Student,
  StudentLookup,
} from "./types";

interface DB {
  students: (Student & { password: string })[];
  enforcers: (Enforcer & { password: string })[];
  admins: (Admin & { password: string })[];
  payments: Payment[];
  fees: Fee[];
}

const KEY = "sp_mock_db_v3";

/** A drawn sample bank slip so the admin's slip preview has something to show in demo mode. */
const SAMPLE_SLIP =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="460" viewBox="0 0 360 460" font-family="Arial, sans-serif">
      <rect width="360" height="460" fill="#fdfcf7"/>
      <rect x="0" y="0" width="360" height="64" fill="#1f4e8c"/>
      <text x="20" y="40" fill="#fff" font-size="20" font-weight="bold">SAMPLE BANK</text>
      <text x="20" y="100" font-size="15" font-weight="bold" fill="#222">CASH DEPOSIT SLIP</text>
      <text x="20" y="135" font-size="12" fill="#555">Account name</text>
      <text x="20" y="153" font-size="14" fill="#111">SLIIT Parking Fund</text>
      <text x="20" y="185" font-size="12" fill="#555">Reference</text>
      <text x="20" y="203" font-size="14" fill="#111">IT26543867 - Vehicle Pass</text>
      <text x="20" y="235" font-size="12" fill="#555">Date</text>
      <text x="20" y="253" font-size="14" fill="#111">2026-11-03</text>
      <text x="20" y="285" font-size="12" fill="#555">Amount</text>
      <text x="20" y="310" font-size="24" font-weight="bold" fill="#111">LKR 1,500.00</text>
      <circle cx="270" cy="380" r="46" fill="none" stroke="#c0392b" stroke-width="3" opacity=".7"/>
      <text x="270" y="385" text-anchor="middle" font-size="13" font-weight="bold" fill="#c0392b" opacity=".8">PAID</text>
      <text x="20" y="440" font-size="10" fill="#999">Demo image - not a real slip</text>
    </svg>`,
  );

function seed(): DB {
  return {
    students: [
      {
        id: "IT26123567",
        fullName: "Guwan Jayakody",
        contact: "0771236767",
        vehicleNumber: "CCC-6767",
        vehicleType: "Car",
        passStatus: "active",
        passValidUntil: "2027-07-05",
        qrToken: "SLIITPARK:IT26123567",
        password: "password123",
      },
      {
        id: "IT26478467",
        fullName: "Nethmi Perera",
        contact: "0712345678",
        vehicleNumber: "BKL-6567",
        vehicleType: "Motorbike",
        passStatus: "active",
        passValidUntil: "2027-03-01",
        qrToken: "SLIITPARK:IT26478467",
        password: "password123",
      },
      {
        id: "IT26543867",
        fullName: "Kasun Silva",
        contact: "0759876543",
        vehicleNumber: "KS-9467",
        vehicleType: "Car",
        passStatus: "pending", // uploaded a slip at sign-up; waiting for admin approval
        passValidUntil: null,
        qrToken: null,
        password: "password123",
      },
      // Registered without a slip → sees "Vehicle Pass Pending…"
      {
        id: "IT26777001",
        fullName: "Sahan Fernando",
        contact: "0701234567",
        vehicleNumber: "WP-4521",
        vehicleType: "Motorbike",
        passStatus: "pending",
        passValidUntil: null,
        qrToken: null,
        password: "password123",
      },
    ],
    enforcers: [{ id: "EN0106", fullName: "John Doe", password: "password123" }],
    admins: [{ id: "ADMIN01", fullName: "Parking Admin", password: "admin123" }],
    payments: [
      { id: "P1", studentId: "IT26123567", kind: "fee", amount: 250, date: "2026-11-04", status: "pending", slipUrl: null, feeId: "F1" },
      { id: "P2", studentId: "IT26123567", kind: "fee", amount: 150, date: "2026-10-12", status: "approved", slipUrl: null },
      { id: "P3", studentId: "IT26123567", kind: "pass", amount: 1500, date: "2026-09-09", status: "approved", slipUrl: null },
      { id: "P4", studentId: "IT26478467", kind: "fee", amount: 250, date: "2026-11-02", status: "pending", slipUrl: null, feeId: "F2" },
      { id: "P5", studentId: "IT26543867", kind: "pass", amount: 1500, date: "2026-11-03", status: "pending", slipUrl: SAMPLE_SLIP },
      { id: "P6", studentId: "IT26478467", kind: "pass", amount: 1500, date: "2026-10-04", status: "approved", slipUrl: null },
      { id: "P7", studentId: "IT26543867", kind: "fee", amount: 250, date: "2026-10-02", status: "rejected", slipUrl: null },
    ],
    fees: [
      { id: "F1", studentId: "IT26123567", vehicleNumber: "CCC-6767", amount: 250, reason: "Parked in a no-parking zone", date: "2026-11-04", status: "pending", issuedBy: "EN0106" },
      { id: "F2", studentId: "IT26478467", vehicleNumber: "BKL-6567", amount: 250, reason: "Unregistered parking slot", date: "2026-10-04", status: "paid", issuedBy: "EN0106" },
      { id: "F3", studentId: "IT26543867", vehicleNumber: "KS-9467", amount: 250, reason: "Parked without a valid pass", date: "2026-10-02", status: "unpaid", issuedBy: "EN0106" },
    ],
  };
}

function load(): DB {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {}
  const db = seed();
  save(db);
  return db;
}

function save(db: DB) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

/** Issue the QR pass. Only called when an admin approves the pass payment slip. */
function activatePass(s: Student) {
  const until = new Date();
  until.setFullYear(until.getFullYear() + 1);
  s.passStatus = "active";
  s.passValidUntil = until.toISOString().slice(0, 10);
  s.qrToken = `SLIITPARK:${s.id}`;
}

function revokePass(s: Student) {
  s.passStatus = "rejected";
  s.passValidUntil = null;
  s.qrToken = null;
}

const delay = <T,>(v: T, ms = 350) => new Promise<T>((r) => setTimeout(() => r(v), ms));
const today = () => new Date().toISOString().slice(0, 10);
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const strip = <T extends { password: string }>(row: T): Omit<T, "password"> => {
  const copy: Partial<T> = { ...row };
  delete copy.password;
  return copy as Omit<T, "password">;
};

function whoAmI(role: string) {
  const s = getSession();
  if (!s || s.role !== role) throw new ApiError("Please log in again.", 401);
  return s.userId;
}

function fileToDataUrl(file: File): Promise<string | null> {
  if (file.size > 1_500_000) return Promise.resolve(null); // keep localStorage small
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

function findStudent(db: DB, q: string) {
  const needle = q.trim().toUpperCase().replace(/^SLIITPARK:/, "");
  return db.students.find(
    (s) => s.id.toUpperCase() === needle || s.vehicleNumber.toUpperCase().replace(/\s/g, "") === needle.replace(/\s/g, ""),
  );
}

export const mock = {
  async studentLogin(id: string, password: string): Promise<LoginResult> {
    const s = load().students.find((x) => x.id.toUpperCase() === id.trim().toUpperCase());
    if (!s || s.password !== password) throw new ApiError("Incorrect IT number or password.", 401);
    return delay({ token: `mock-${s.id}`, userId: s.id });
  },

  async studentRegister(input: RegisterInput) {
    const db = load();
    const id = input.id.trim().toUpperCase();
    if (db.students.some((s) => s.id === id)) throw new ApiError("This IT number is already registered.", 409);
    const student: DB["students"][number] = {
      id,
      fullName: input.fullName.trim(),
      contact: input.contact.trim(),
      vehicleNumber: input.vehicleNumber.trim().toUpperCase(),
      vehicleType: input.vehicleType,
      passStatus: "pending",
      passValidUntil: null,
      qrToken: null,
      password: input.password,
    };
    db.students.push(student);
    if (input.paymentSlip) {
      // Slip uploaded → waits in the admin's Pending Payments. QR appears only after approval.
      db.payments.push({
        id: uid("P"),
        studentId: id,
        kind: "pass",
        amount: 1500,
        date: today(),
        status: "pending",
        slipUrl: await fileToDataUrl(input.paymentSlip),
      });
    }
    // Either way passStatus starts "pending". Without a slip they upload one later from Pay Fees.
    save(db);
    return delay({ ok: true as const });
  },

  async enforcerLogin(id: string, password: string): Promise<LoginResult> {
    const e = load().enforcers.find((x) => x.id.toUpperCase() === id.trim().toUpperCase());
    if (!e || e.password !== password) throw new ApiError("Incorrect enforcer ID or password.", 401);
    return delay({ token: `mock-${e.id}`, userId: e.id });
  },

  async adminLogin(id: string, password: string): Promise<LoginResult> {
    const a = load().admins.find((x) => x.id.toUpperCase() === id.trim().toUpperCase());
    if (!a || a.password !== password) throw new ApiError("Incorrect admin ID or password.", 401);
    return delay({ token: `mock-${a.id}`, userId: a.id });
  },

  async me(): Promise<Student> {
    const id = whoAmI("student");
    const s = load().students.find((x) => x.id === id);
    if (!s) throw new ApiError("Account not found.", 404);
    return delay(strip(s));
  },

  async myPayments(): Promise<Payment[]> {
    const id = whoAmI("student");
    return delay(load().payments.filter((p) => p.studentId === id).sort((a, b) => b.date.localeCompare(a.date)));
  },

  async myFees(): Promise<Fee[]> {
    const id = whoAmI("student");
    return delay(load().fees.filter((f) => f.studentId === id).sort((a, b) => b.date.localeCompare(a.date)));
  },

  async submitPayment(input: { kind: PaymentKind; amount: number; feeId?: string; slip: File }): Promise<Payment> {
    const id = whoAmI("student");
    const db = load();
    const p: Payment = {
      id: uid("P"),
      studentId: id,
      kind: input.kind,
      amount: input.amount,
      date: today(),
      status: "pending",
      slipUrl: await fileToDataUrl(input.slip),
      feeId: input.feeId ?? null,
    };
    db.payments.push(p);
    if (input.feeId) {
      const f = db.fees.find((x) => x.id === input.feeId);
      if (f) f.status = "pending";
    }
    if (input.kind === "pass") {
      const s = db.students.find((x) => x.id === id);
      if (s && s.passStatus !== "active") s.passStatus = "pending"; // admin must approve first
    }
    save(db);
    return delay(p);
  },

  async enforcerMe(): Promise<Enforcer> {
    const id = whoAmI("enforcer");
    const e = load().enforcers.find((x) => x.id === id);
    if (!e) throw new ApiError("Account not found.", 404);
    return delay(strip(e));
  },

  async lookupStudent(q: string): Promise<StudentLookup> {
    const db = load();
    const s = findStudent(db, q);
    if (!s) throw new ApiError("No student found for that QR, ID or vehicle number.", 404);
    return delay({
      student: strip(s),
      overdueFees: db.fees.filter((f) => f.studentId === s.id && f.status === "unpaid"),
    });
  },

  async issueFee(input: { studentId: string; amount: number; reason: string }): Promise<Fee> {
    const enforcerId = whoAmI("enforcer");
    const db = load();
    const s = db.students.find((x) => x.id === input.studentId);
    if (!s) throw new ApiError("Student not found.", 404);
    const fee: Fee = {
      id: uid("F"),
      studentId: s.id,
      vehicleNumber: s.vehicleNumber,
      amount: input.amount,
      reason: input.reason,
      date: today(),
      status: "unpaid",
      issuedBy: enforcerId,
    };
    db.fees.push(fee);
    save(db);
    return delay(fee);
  },

  async issuedFees(status?: FeeStatus): Promise<Fee[]> {
    const enforcerId = whoAmI("enforcer");
    return delay(
      load()
        .fees.filter((f) => f.issuedBy === enforcerId && (!status || f.status === status))
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
  },

  async adminEnforcers(): Promise<Enforcer[]> {
    whoAmI("admin");
    return delay(load().enforcers.map(strip).sort((a, b) => a.id.localeCompare(b.id)));
  },

  async createEnforcer(input: NewEnforcerInput): Promise<Enforcer> {
    whoAmI("admin");
    const db = load();
    const id = input.id.trim().toUpperCase();
    if (db.enforcers.some((e) => e.id === id)) throw new ApiError(`Enforcer ID ${id} is already taken.`, 409);
    const e = { id, fullName: input.fullName.trim(), password: input.password };
    db.enforcers.push(e);
    save(db);
    return delay(strip(e));
  },

  async adminMe(): Promise<Admin> {
    const id = whoAmI("admin");
    const a = load().admins.find((x) => x.id === id);
    if (!a) throw new ApiError("Account not found.", 404);
    return delay(strip(a));
  },

  async adminPayments(filter: { status?: PaymentStatus; kind?: PaymentKind; studentId?: string }): Promise<Payment[]> {
    whoAmI("admin");
    const q = filter.studentId?.trim().toUpperCase();
    return delay(
      load()
        .payments.filter(
          (p) =>
            (!filter.status || p.status === filter.status) &&
            (!filter.kind || p.kind === filter.kind) &&
            (!q || p.studentId.includes(q)),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
  },

  async reviewPayment(id: string, status: "approved" | "rejected"): Promise<Payment> {
    whoAmI("admin");
    const db = load();
    const p = db.payments.find((x) => x.id === id);
    if (!p) throw new ApiError("Payment not found.", 404);
    p.status = status;
    if (p.feeId) {
      const f = db.fees.find((x) => x.id === p.feeId);
      if (f) f.status = status === "approved" ? "paid" : "unpaid";
    }
    if (p.kind === "pass") {
      const s = db.students.find((x) => x.id === p.studentId);
      if (s) {
        if (status === "approved") {
          if (s.passStatus !== "active") activatePass(s);
        } else if (s.passStatus !== "active") {
          revokePass(s); // slip refused → student must upload a new one
        }
      }
    }
    save(db);
    return delay(p);
  },
};
