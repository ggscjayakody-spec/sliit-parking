"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, PRICES } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import { BackButton, BackLink, Button, Card, cx, ErrorText, FileField, Loading, money, StatusBadge } from "@/components/ui";
import { useStudent } from "@/components/StudentContext";

type Group = "fees" | "unregistered";
type Choice = {
  key: string;
  group: Group;
  label: string; // "250/= | 2026-11-04", as in the design's dropdowns
  reason: string;
  date: string;
  amount: number;
  kind: "pass" | "fee";
  feeId?: string;
};

/**
 * Pay Fees, following the design:
 *  1. Two dropdowns: your fees, and "Pay Unregistered Fee" (fines for parking without a QR pass).
 *  2. Picking one opens the red screen: the fee on the left, the slip upload box on the right.
 */
export default function PayFees() {
  const { student } = useStudent();
  const { data: fees, loading, error } = useApi(api.myFees, []);
  const { data: payments } = useApi(api.myPayments, []);
  const passSlipPending = (payments ?? []).some((p) => p.kind === "pass" && p.status === "pending");
  const [selected, setSelected] = useState<string | null>(null);

  const choices = useMemo<Choice[]>(() => {
    const list: Choice[] = (fees ?? [])
      .filter((f) => f.status === "unpaid")
      .map((f) => ({
        key: f.id,
        group: f.category === "unregistered" ? "unregistered" : "fees",
        label: `${money(f.amount)} | ${f.date}`,
        reason: f.reason,
        date: f.date,
        amount: f.amount,
        kind: "fee",
        feeId: f.id,
      }));
    // Students who registered without a slip pay the pass fee here too.
    if (student.passStatus !== "active" && payments && !passSlipPending) {
      list.unshift({
        key: "pass",
        group: "fees",
        label: `${money(PRICES.pass)} | Vehicle pass`,
        reason: "Vehicle pass fee (valid for 1 year)",
        date: new Date().toISOString().slice(0, 10),
        amount: PRICES.pass,
        kind: "pass",
      });
    }
    return list;
  }, [fees, student.passStatus, payments, passSlipPending]);

  const current = choices.find((c) => c.key === selected) ?? null;

  if (current) {
    return (
      <div className="space-y-4">
        <BackButton onClick={() => setSelected(null)} />
        <PayScreen choice={current} siblings={choices.filter((c) => c.group === current.group)} onSwitch={setSelected} />
      </div>
    );
  }

  const others = (fees ?? []).filter((f) => f.status !== "unpaid");
  const regular = choices.filter((c) => c.group === "fees");
  const unregistered = choices.filter((c) => c.group === "unregistered");

  return (
    <div className="space-y-4">
      <BackLink href="/student" />
      <Card className="p-5 sm:p-6">
        <h1 className="text-2xl font-extrabold">Pay Fees</h1>
        <p className="text-sm text-ink-soft">Choose the fee you&apos;re paying, then upload your bank slip.</p>

        {loading ? (
          <Loading />
        ) : error ? (
          <div className="mt-4">
            <ErrorText>{error}</ErrorText>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 md:divide-x md:divide-lilac-200">
            <FeePicker title="Fees" hint="Fines and your vehicle pass fee" choices={regular} onPick={setSelected} />
            <div className="md:pl-4">
              <FeePicker
                title="Pay Unregistered Fee"
                hint="Fines for parking without a QR pass"
                choices={unregistered}
                onPick={setSelected}
              />
            </div>
          </div>
        )}

        {others.length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-ink-soft">Paid or waiting for approval</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {others.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/50 px-3 py-2">
                  <span className="min-w-0 truncate">
                    {money(f.amount)} · {f.date} · {f.reason}
                  </span>
                  <StatusBadge status={f.status} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

function FeePicker({ title, hint, choices, onPick }: { title: string; hint: string; choices: Choice[]; onPick: (key: string) => void }) {
  const empty = choices.length === 0;
  return (
    <label className="block">
      <span className="block font-extrabold">{title}</span>
      <span className="mb-2 block text-xs text-ink-soft">{hint}</span>
      <select
        className={cx("field appearance-none pr-9", empty && "text-[#9a97c2]")}
        value=""
        disabled={empty}
        onChange={(e) => e.target.value && onPick(e.target.value)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234b4785' stroke-width='3'><path d='m6 9 6 6 6-6'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.9rem center",
        }}
      >
        <option value="">{empty ? "Nothing to pay" : `Select (${choices.length})…`}</option>
        {choices.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The red screen: fee on the left, slip upload on the right. */
function PayScreen({ choice, siblings, onSwitch }: { choice: Choice; siblings: Choice[]; onSwitch: (key: string) => void }) {
  const router = useRouter();
  const { reload: reloadStudent } = useStudent();
  const [slip, setSlip] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!slip) return setError("Upload your bank slip.");
    setError(null);
    setSubmitting(true);
    try {
      await api.submitPayment({ kind: choice.kind, amount: choice.amount, feeId: choice.feeId, slip });
      if (choice.kind === "pass") reloadStudent();
      router.push("/student/payments");
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-mesh-coral grid gap-4 rounded-2xl p-4 text-white shadow-xl shadow-coral/25 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold uppercase tracking-wider text-white/85">
          {choice.group === "unregistered" ? "Pay Unregistered Fee" : "Pay Fee"}
        </p>
        <select
          value={choice.key}
          onChange={(e) => onSwitch(e.target.value)}
          className="w-full appearance-none rounded-lg border border-white/30 bg-black/20 px-3 py-2.5 text-base font-bold text-white outline-none focus:ring-2 focus:ring-white/50"
        >
          {siblings.map((c) => (
            <option key={c.key} value={c.key} className="text-ink">
              {c.label}
            </option>
          ))}
        </select>
        <div className="rounded-xl bg-black/15 p-4">
          <p className="text-sm text-white/80">Amount</p>
          <p className="text-3xl font-extrabold">{money(choice.amount)}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-white/75">Reason</dt>
              <dd className="text-right font-semibold">{choice.reason}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/75">Date</dt>
              <dd className="font-semibold">{choice.date}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex min-h-72 flex-col rounded-xl bg-[#8f1f2e]/55 p-4">
        <p className="font-extrabold">Upload payment slip</p>
        <p className="text-sm text-white/80">Pay at the bank or online, then upload a photo or PDF of the slip.</p>
        <div className="mt-4 rounded-xl bg-white/95 p-4 text-ink">
          <FileField label="Bank slip" file={slip} onFile={setSlip} />
        </div>
        <div className="mt-3 [&_p]:!bg-white [&_p]:!text-bad">
          <ErrorText>{error}</ErrorText>
        </div>
        <Button type="submit" loading={submitting} className="mt-auto w-full !border-white !bg-white !text-coral-dark">
          Submit payment
        </Button>
        <p className="mt-2 text-center text-xs text-white/80">An admin will check the slip. You&apos;ll see the status in Payment History.</p>
      </div>
    </form>
  );
}
