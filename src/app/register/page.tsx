"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, PRICES } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import type { VehicleType } from "@/lib/types";
import { Button, Card, ErrorText, Field, FileField, money, SelectField } from "@/components/ui";

const VEHICLE_TYPES: VehicleType[] = ["Car", "Motorbike", "Van", "Three-wheeler", "Other"];

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    id: "",
    fullName: "",
    password: "",
    confirm: "",
    contact: "",
    vehicleType: "" as VehicleType | "",
    vehicleNumber: "",
  });
  const [slip, setSlip] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^IT\d{8}$/i.test(form.id.trim())) return setError("IT number should look like IT26123567.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords don't match.");
    if (!/^0\d{9}$/.test(form.contact.replace(/\s/g, ""))) return setError("Contact number should be 10 digits, e.g. 0771234567.");
    if (!form.vehicleType) return setError("Choose a vehicle type.");

    setLoading(true);
    try {
      await api.studentRegister({
        id: form.id.trim().toUpperCase(),
        fullName: form.fullName,
        contact: form.contact.replace(/\s/g, ""),
        vehicleNumber: form.vehicleNumber,
        vehicleType: form.vehicleType,
        password: form.password,
        paymentSlip: slip,
      });
      router.push(slip ? "/register/success?slip=1" : "/register/success");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-10">
      <Card className="w-full max-w-3xl p-6 sm:p-8">
        <h1 className="text-center text-2xl font-extrabold text-ink sm:text-3xl">Student Registration for SLIIT Parking</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">
          Upload your {money(PRICES.pass)} vehicle pass payment slip, or skip it and upload later. Your QR pass appears once an admin approves the slip.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-x-6">
          <Field label="Student Registration Number" placeholder="IT26123567" value={form.id} onChange={set("id")} autoCapitalize="characters" required />
          <Field label="Student Full Name" value={form.fullName} onChange={set("fullName")} autoComplete="name" required />
          <Field label="Login Password" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" required />
          <Field label="Login Password Confirmation" type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />
          <Field label="Student Contact Number" type="tel" inputMode="tel" placeholder="0771234567" value={form.contact} onChange={set("contact")} required />
          <SelectField label="Student Vehicle Type" value={form.vehicleType} onChange={set("vehicleType")} required>
            <option value="" disabled>
              Select…
            </option>
            {VEHICLE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </SelectField>
          <FileField label="Payment Slip" optional file={slip} onFile={setSlip} />
          <Field label="Student Vehicle Number" placeholder="CAB-1234" value={form.vehicleNumber} onChange={set("vehicleNumber")} autoCapitalize="characters" required />

          <p className="-mt-1 text-xs text-ink-soft sm:col-span-2">
            <span className="text-coral">*</span> Optional
          </p>
          <div className="sm:col-span-2">
            <ErrorText>{error}</ErrorText>
          </div>
          <div className="flex flex-col-reverse items-center gap-3 sm:col-span-2 sm:flex-row sm:justify-between">
            <p className="text-sm text-ink-soft">
              Already registered?{" "}
              <Link href="/login" className="font-bold text-ink underline underline-offset-4">
                Log in
              </Link>
            </p>
            <Button type="submit" variant="primary" loading={loading} className="w-full sm:w-auto sm:min-w-40">
              Register
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
