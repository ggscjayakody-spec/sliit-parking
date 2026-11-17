"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, PRICES } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import type { Fee } from "@/lib/types";
import { Button, Card, cx, Empty, ErrorText, FileField, Loading, money, StatusBadge } from "@/components/ui";
import { useStudent } from "@/components/StudentContext";

type Choice = { key: string; label: string; detail: string; amount: number; kind: "pass" | "fee"; feeId?: string };

export default function PayFees() {
  const router = useRouter();
  const { student, reload: reloadStudent } = useStudent();
  const { data: fees, loading, error } = useApi(api.myFees, []);
  const { data: payments } = useApi(api.myPayments, []);
  const passSlipPending = (payments ?? []).some((p) => p.kind === "pass" && p.status === "pending");
  const [selected, setSelected] = useState<string | null>(null);
  const [slip, setSlip] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const choices = useMemo<Choice[]>(() => {
    const list: Choice[] = (fees ?? [])
      .filter((f: Fee) => f.status === "unpaid")
      .map((f) => ({ key: f.id, label: f.reason, detail: `${f.date} · ${f.vehicleNumber}`, amount: f.amount, kind: "fee", feeId: f.id }));
    if (student.passStatus !== "active" && payments && !passSlipPending) {
      list.unshift({ key: "pass", label: "Vehicle pass fee", detail: "Valid for 1 year", amount: PRICES.pass, kind: "pass" });
    }
    return list;
  }, [fees, student.passStatus, payments, passSlipPending]);

  const current = choices.find((c) => c.key === selected) ?? null;
  const others = (fees ?? []).filter((f) => f.status !== "unpaid");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!current) return setSubmitError("Choose a fee to pay.");
    if (!slip) return setSubmitError("Upload your bank slip.");
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.submitPayment({ kind: current.kind, amount: current.amount, feeId: current.feeId, slip });
      if (current.kind === "pass") reloadStudent();
      router.push("/student/payments");
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h1 className="text-2xl font-extrabold">Pay Fees</h1>
        <p className="text-sm text-ink-soft">Pick what you&apos;re paying for.</p>

        <div className="mt-5 space-y-2">
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorText>{error}</ErrorText>
          ) : choices.length === 0 ? (
            <Empty>Nothing to pay right now. 🎉</Empty>
          ) : (
            choices.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelected(c.key)}
                className={cx(
                  "flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors",
                  selected === c.key ? "border-coral bg-coral/10 ring-2 ring-coral/25" : "border-white/80 bg-white/70 hover:bg-white",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-bold">{c.label}</span>
                  <span className="text-sm text-ink-soft">{c.detail}</span>
                </span>
                <span className="text-lg font-extrabold">{money(c.amount)}</span>
              </button>
            ))
          )}
        </div>

        {others.length > 0 && (
          <>
            <h2 className="mt-6 text-sm font-bold uppercase tracking-wider text-ink-soft">Other fees</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {others.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-2">
                  <span>
                    {money(f.amount)} · {f.date}
                  </span>
                  <StatusBadge status={f.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <form onSubmit={submit} className="bg-mesh-coral flex flex-col rounded-2xl p-5 text-white shadow-xl shadow-coral/25 sm:p-6">
        <h2 className="text-xl font-extrabold">Upload payment slip</h2>
        <p className="text-sm text-white/85">Pay at the bank or online, then upload a photo or PDF of the slip.</p>

        <div className="mt-5 rounded-xl bg-black/15 p-4">
          <p className="text-sm text-white/80">Amount</p>
          <p className="text-3xl font-extrabold">{current ? money(current.amount) : "—"}</p>
          <p className="mt-1 truncate text-sm text-white/85">{current ? current.label : "Select a fee on the left"}</p>
        </div>

        <div className="mt-4 rounded-xl bg-white/95 p-4 text-ink">
          <FileField label="Bank slip" file={slip} onFile={setSlip} />
        </div>

        <div className="mt-4 [&_p]:!bg-white [&_p]:!text-bad">
          <ErrorText>{submitError}</ErrorText>
        </div>

        <Button type="submit" loading={submitting} disabled={!current} className="mt-auto !bg-white !text-coral-dark !border-white">
          Submit payment
        </Button>
        <p className="mt-3 text-center text-xs text-white/80">An admin will verify the slip. You&apos;ll see the status in Payment History.</p>
      </form>
    </div>
  );
}
