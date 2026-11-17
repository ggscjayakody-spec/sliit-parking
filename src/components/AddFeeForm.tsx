"use client";

import { useState, type FormEvent } from "react";
import { api, PRICES } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import type { Fee, FeeCategory, Student } from "@/lib/types";
import { Button, ErrorText, Field, money, SelectField } from "./ui";

const REASONS: { label: string; amount: number; category: FeeCategory }[] = [
  { label: "Parked without a QR pass", amount: PRICES.unregistered, category: "unregistered" },
  { label: "Parked in a no-parking zone", amount: 250, category: "general" },
  { label: "Parked across two slots", amount: 150, category: "general" },
  { label: "Blocking another vehicle", amount: 250, category: "general" },
  { label: "Other", amount: 0, category: "general" },
];

/**
 * The red "Add Fees" panel from the design.
 * - With `student`: used inline under the scanned student's details.
 * - Without: opened straight from the enforcer home, so it asks for the Student ID / Vehicle Number.
 */
export function AddFeeForm({ student, onAdded }: { student?: Student; onAdded: (fee: Fee, student: Student) => void }) {
  const [who, setWho] = useState("");
  const [reason, setReason] = useState(REASONS[0].label);
  const [other, setOther] = useState("");
  const [amount, setAmount] = useState(String(REASONS[0].amount));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    const r = REASONS.find((x) => x.label === reason) ?? REASONS[0];
    const finalReason = r.label === "Other" ? other.trim() : r.label;
    if (!student && !who.trim()) return setError("Enter the Student ID or Vehicle Number.");
    if (!Number.isFinite(n) || n <= 0) return setError("Enter an amount above 0.");
    if (!finalReason) return setError("Describe the reason.");
    setError(null);
    setSaving(true);
    try {
      const target = student ?? (await api.lookupStudent(who.trim())).student;
      const fee = await api.issueFee({ studentId: target.id, amount: n, reason: finalReason, category: r.category });
      onAdded(fee, target);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-mesh-coral rounded-2xl p-5 text-white shadow-xl shadow-coral/25">
      <h2 className="text-2xl font-extrabold">Add Fees</h2>
      {student && (
        <p className="text-sm text-white/90">
          {student.fullName} · {student.vehicleNumber}
        </p>
      )}

      <div className="mt-4 space-y-4 rounded-xl bg-white/95 p-4 text-ink">
        {!student && (
          <Field
            label="Student ID / Vehicle Number"
            placeholder="IT26123567 or CCC-6767"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            autoCapitalize="characters"
            required
          />
        )}
        <SelectField
          label="Reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            const r = REASONS.find((x) => x.label === e.target.value);
            if (r && r.amount) setAmount(String(r.amount));
          }}
        >
          {REASONS.map((r) => (
            <option key={r.label}>{r.label}</option>
          ))}
        </SelectField>
        {reason === "Other" && <Field label="Describe the reason" value={other} onChange={(e) => setOther(e.target.value)} required />}
        <Field label="Amount (LKR)" type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <ErrorText>{error}</ErrorText>
      </div>

      <Button type="submit" loading={saving} className="mt-4 w-full !border-white !bg-white !text-coral-dark">
        Add fee {Number(amount) > 0 && `· ${money(Number(amount))}`}
      </Button>
    </form>
  );
}
