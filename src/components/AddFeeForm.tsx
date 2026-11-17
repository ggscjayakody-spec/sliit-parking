"use client";

import { useState, type FormEvent } from "react";
import { api, PRICES } from "@/lib/api";
import { errorMessage } from "@/lib/hooks";
import type { Fee, Student } from "@/lib/types";
import { Button, ErrorText, Field, money } from "./ui";

/**
 * The red "Add Fees" panel from the design.
 * A fee charges a student WITHOUT a valid pass for the time they parked.
 * - With `student`: used inline under the scanned student's details.
 * - Without: opened straight from the enforcer home, so it asks for the Student ID / Vehicle Number.
 */
export function AddFeeForm({ student, onAdded }: { student?: Student; onAdded: (fee: Fee, student: Student) => void }) {
  const [who, setWho] = useState("");
  const [hours, setHours] = useState("1");
  const [amount, setAmount] = useState(String(PRICES.hourly));
  const [amountEdited, setAmountEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function changeHours(v: string) {
    setHours(v);
    const h = Number(v);
    if (!amountEdited && Number.isFinite(h) && h > 0) setAmount(String(Math.round(h * PRICES.hourly)));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const h = Number(hours);
    const n = Number(amount);
    if (!student && !who.trim()) return setError("Enter the Student ID or Vehicle Number.");
    if (!Number.isFinite(h) || h <= 0 || h > 24) return setError("Parking period must be between 1 and 24 hours.");
    if (!Number.isFinite(n) || n <= 0) return setError("Enter an amount above 0.");
    setError(null);
    setSaving(true);
    try {
      const target = student ?? (await api.lookupStudent(who.trim())).student;
      if (target.passStatus === "active") {
        throw new Error(`${target.fullName} has a valid parking pass, so no parking fee applies.`);
      }
      const fee = await api.issueFee({ studentId: target.id, hours: h, amount: n });
      onAdded(fee, target);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-mesh-coral rounded-2xl p-5 text-white shadow-xl shadow-coral/25">
      <h2 className="text-2xl font-extrabold">Add Fees</h2>
      <p className="text-sm text-white/90">
        {student ? `${student.fullName} · ${student.vehicleNumber} · ` : ""}Parking fee for students without a valid pass.
      </p>

      <div className="mt-4 space-y-4 rounded-xl bg-white/95 p-4 text-ink">
        {!student && (
          <Field
            label="Student ID / Vehicle Number"
            placeholder="IT26543867 or KS-9467"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            autoCapitalize="characters"
            required
          />
        )}
        <Field
          label="Parking period (hours)"
          type="number"
          inputMode="numeric"
          min={1}
          max={24}
          step={1}
          value={hours}
          onChange={(e) => changeHours(e.target.value)}
          required
        />
        <Field
          label="Amount (LKR)"
          type="number"
          inputMode="numeric"
          min={1}
          value={amount}
          onChange={(e) => {
            setAmountEdited(true);
            setAmount(e.target.value);
          }}
          hint={`${money(PRICES.hourly)} per hour. You can change it.`}
          required
        />
        <ErrorText>{error}</ErrorText>
      </div>

      <Button type="submit" loading={saving} className="mt-4 w-full !border-white !bg-white !text-coral-dark">
        Add fee {Number(amount) > 0 && `· ${money(Number(amount))}`}
      </Button>
    </form>
  );
}
