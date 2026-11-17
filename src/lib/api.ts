/**
 * Every call to the backend goes through this file.
 *
 * Three modes:
 *  - Default: the backend built into this app (src/app/api → src/server), at /api.
 *  - NEXT_PUBLIC_API_URL=https://…  → a separate backend at that address instead.
 *  - NEXT_PUBLIC_DEMO_MODE=1        → no backend at all: sample data kept in the browser
 *                                     (src/lib/mock.ts). Handy for working offline.
 */
import { getSession } from "./session";
import { mock } from "./mock";
import { ApiError } from "./errors";
import { shrinkImage } from "./image";
import type {
  Admin,
  Enforcer,
  EnforcerActivity,
  EnforcerSummary,
  Fee,
  FeeStatus,
  LoginResult,
  NewEnforcerInput,
  NewFeeInput,
  Payment,
  PaymentKind,
  PaymentStatus,
  RegisterInput,
  Student,
  StudentLookup,
} from "./types";

export const USING_MOCK = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");

export { ApiError };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers = new Headers(init.headers);
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {}
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const json = (body: unknown) => JSON.stringify(body);
const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  // ───────── Auth ─────────
  studentLogin: (id: string, password: string) =>
    USING_MOCK
      ? mock.studentLogin(id, password)
      : request<LoginResult>("/auth/student/login", { method: "POST", body: json({ id, password }) }),

  studentRegister: async (input: RegisterInput) => {
    if (USING_MOCK) return mock.studentRegister(input);
    const fd = new FormData();
    fd.set("id", input.id);
    fd.set("fullName", input.fullName);
    fd.set("contact", input.contact);
    fd.set("vehicleNumber", input.vehicleNumber);
    fd.set("vehicleType", input.vehicleType);
    fd.set("password", input.password);
    if (input.paymentSlip) fd.set("paymentSlip", await shrinkImage(input.paymentSlip));
    return request<{ ok: true }>("/auth/student/register", { method: "POST", body: fd });
  },

  enforcerLogin: (id: string, password: string) =>
    USING_MOCK
      ? mock.enforcerLogin(id, password)
      : request<LoginResult>("/auth/enforcer/login", { method: "POST", body: json({ id, password }) }),

  /** Admin login is password only, as in the design. */
  adminLogin: (password: string) =>
    USING_MOCK
      ? mock.adminLogin(password)
      : request<LoginResult>("/auth/admin/login", { method: "POST", body: json({ password }) }),

  // ───────── Student ─────────
  me: () => (USING_MOCK ? mock.me() : request<Student>("/students/me")),

  myPayments: () => (USING_MOCK ? mock.myPayments() : request<Payment[]>("/students/me/payments")),

  myFees: () => (USING_MOCK ? mock.myFees() : request<Fee[]>("/students/me/fees")),

  submitPayment: async (input: { kind: PaymentKind; amount: number; feeId?: string; slip: File }) => {
    if (USING_MOCK) return mock.submitPayment(input);
    const fd = new FormData();
    fd.set("kind", input.kind);
    fd.set("amount", String(input.amount));
    if (input.feeId) fd.set("feeId", input.feeId);
    fd.set("slip", await shrinkImage(input.slip));
    return request<Payment>("/payments", { method: "POST", body: fd });
  },

  // ───────── Enforcer ─────────
  enforcerMe: () => (USING_MOCK ? mock.enforcerMe() : request<Enforcer>("/enforcers/me")),

  /** q = scanned QR text, IT number, or vehicle number.
   *  `via` records the lookup in the enforcer's activity: "scan" (QR) or "search" (typed). */
  lookupStudent: (q: string, via?: "scan" | "search") =>
    USING_MOCK ? mock.lookupStudent(q, via) : request<StudentLookup>(`/students/lookup${qs({ q, via })}`),

  issueFee: (input: NewFeeInput) =>
    USING_MOCK ? mock.issueFee(input) : request<Fee>("/fees", { method: "POST", body: json(input) }),

  issuedFees: (status?: FeeStatus) =>
    USING_MOCK ? mock.issuedFees(status) : request<Fee[]>(`/enforcers/me/fees${qs({ status })}`),

  // ───────── Admin ─────────
  adminMe: () => (USING_MOCK ? mock.adminMe() : request<Admin>("/admins/me")),

  adminPayments: (filter: { status?: PaymentStatus; kind?: PaymentKind; studentId?: string }) =>
    USING_MOCK
      ? mock.adminPayments(filter)
      : request<Payment[]>(`/admin/payments${qs(filter as Record<string, string | undefined>)}`),

  reviewPayment: (id: string, status: "approved" | "rejected") =>
    USING_MOCK
      ? mock.reviewPayment(id, status)
      : request<Payment>(`/admin/payments/${encodeURIComponent(id)}`, { method: "PATCH", body: json({ status }) }),

  /** Enforcer accounts can only be created here, by an admin. There is no enforcer sign-up. */
  adminEnforcers: () => (USING_MOCK ? mock.adminEnforcers() : request<EnforcerSummary[]>("/admin/enforcers")),

  enforcerActivity: (id: string) =>
    USING_MOCK ? mock.enforcerActivity(id) : request<EnforcerActivity>(`/admin/enforcers/${encodeURIComponent(id)}/activity`),

  createEnforcer: (input: NewEnforcerInput) =>
    USING_MOCK ? mock.createEnforcer(input) : request<Enforcer>("/admin/enforcers", { method: "POST", body: json(input) }),

  adminStudent: (id: string) =>
    USING_MOCK ? mock.lookupStudent(id) : request<StudentLookup>(`/admin/students/${encodeURIComponent(id)}`),
};

/** Fixed prices shown in the UI. Move to the backend if they need to change without a redeploy. */
export const PRICES = {
  pass: 1500, // vehicle pass, valid 1 year
  hourly: 50, // parking fee per hour for students without a valid pass (placeholder rate)
};
