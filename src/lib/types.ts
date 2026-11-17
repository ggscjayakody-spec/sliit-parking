// Shared data shapes. These are the contract with the backend — see README "API contract".

export type Role = "student" | "enforcer" | "admin";

export type VehicleType = "Car" | "Motorbike" | "Van" | "Three-wheeler" | "Other";

export type PassStatus = "active" | "pending" | "rejected" | "expired";

export interface Student {
  id: string; // IT number, e.g. IT26123567
  fullName: string;
  contact: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  passStatus: PassStatus;
  passValidUntil: string | null; // YYYY-MM-DD
  qrToken: string | null; // value encoded in the pass QR; null until the pass is approved
}

export type PaymentKind = "pass" | "fee";
export type PaymentStatus = "pending" | "approved" | "rejected";

export interface Payment {
  id: string;
  studentId: string;
  kind: PaymentKind;
  amount: number; // LKR
  date: string; // YYYY-MM-DD
  status: PaymentStatus;
  slipUrl: string | null; // link to the uploaded bank slip
  feeId?: string | null;
}

export type FeeStatus = "unpaid" | "pending" | "paid";

/**
 * A parking fee: issued by an enforcer when a student parks WITHOUT a valid pass
 * (no QR yet, or the pass has expired). It charges for the time they parked.
 * Students pay these under "Pay Unregistered Fee".
 */
export interface Fee {
  id: string;
  studentId: string;
  vehicleNumber: string;
  hours: number; // parking period given by the enforcer
  amount: number;
  date: string;
  status: FeeStatus;
  issuedBy: string; // enforcer ID
}

export interface Enforcer {
  id: string; // e.g. EN0106
  fullName: string;
}

export interface NewFeeInput {
  studentId: string;
  hours: number;
  amount: number;
}

export interface NewEnforcerInput {
  id: string;
  fullName: string;
  password: string;
}

export interface Admin {
  id: string;
  fullName: string;
}

export interface Session {
  role: Role;
  token: string;
  userId: string;
}

export interface LoginResult {
  token: string;
  userId: string;
}

export interface StudentLookup {
  student: Student;
  overdueFees: Fee[];
}

export interface RegisterInput {
  id: string;
  fullName: string;
  contact: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  password: string;
  paymentSlip?: File | null; // optional: with a slip the pass is issued right away
}
