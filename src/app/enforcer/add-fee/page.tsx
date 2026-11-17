"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, PRICES } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import { BackLink, Button, Card, ErrorText, Field, Loading, money, SearchInput, SelectField } from "@/components/ui";

const REASONS = [
  { label: "Unregistered vehicle / no pass", amount: PRICES.unregistered },
  { label: "Parked in a no-parking zone", amount: 250 },
  { label: "Parked across two slots", amount: 150 },
  { label: "Blocking another vehicle", amount: 250 },
  { label: "Other", amount: 0 },
];

export default function AddFeePage() {
  return (
    <Suspense fallback={<Loading />}>
      <AddFee />
    </Suspense>
  );
}

function AddFee() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";
  const [q, setQ] = useState("");

  if (!id) {
    return (
      <>
        <BackLink href="/enforcer" />
        <Card className="p-5">
          <h1 className="text-xl font-extrabold">Add Fees</h1>
          <p className="mb-4 text-sm text-ink-soft">Find the student first, or scan their QR.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(`/enforcer/student?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <SearchInput placeholder="Student ID / Vehicle Number" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
        </Card>
      </>
    );
  }
  return <FeeForm studentId={id} />;
}

function FeeForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const { data, error, loading } = useApi(() => api.lookupStudent(studentId), [studentId]);
  const [reason, setReason] = useState(REASONS[0].label);
  const [other, setOther] = useState("");
  const [amount, setAmount] = useState(String(REASONS[0].amount));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setSubmitError("Enter an amount above 0.");
    const finalReason = reason === "Other" ? other.trim() : reason;
    if (!finalReason) return setSubmitError("Describe the reason.");
    setSubmitError(null);
    setSaving(true);
    try {
      await api.issueFee({ studentId, amount: n, reason: finalReason });
      setDone(true);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (error || !data) return <ErrorText>{error}</ErrorText>;
  const s = data.student;

  if (done) {
    return (
      <Card className="p-6 text-center">
        <p className="text-2xl font-extrabold">Fee added</p>
        <p className="mt-1 text-ink-soft">
          {money(Number(amount))} charged to {s.fullName} ({s.vehicleNumber}).
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button onClick={() => router.push("/enforcer/fees")}>View Fees</Button>
          <Button variant="primary" onClick={() => router.push("/enforcer/scan")}>
            Scan Next
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <BackLink href={`/enforcer/student?q=${encodeURIComponent(studentId)}`} />
      <form onSubmit={submit} className="bg-mesh-coral rounded-2xl p-5 text-white shadow-xl shadow-coral/25">
        <h1 className="text-2xl font-extrabold">Add Fees</h1>
        <p className="text-sm text-white/90">
          {s.fullName} · {s.id} · {s.vehicleNumber}
        </p>

        <div className="mt-5 space-y-4 rounded-xl bg-white/95 p-4 text-ink">
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
          <ErrorText>{submitError}</ErrorText>
        </div>

        <Button type="submit" loading={saving} className="mt-4 w-full !bg-white !text-coral-dark !border-white">
          Add fee {Number(amount) > 0 && `· ${money(Number(amount))}`}
        </Button>
      </form>
    </>
  );
}
