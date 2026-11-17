"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import type { Payment, PaymentKind } from "@/lib/types";
import { Button, Card, cx, Empty, ErrorText, Loading, money, Tabs } from "@/components/ui";
import { StudentDetails } from "@/components/StudentDetails";
import { SlipPreview } from "@/components/SlipPreview";

type Filter = "all" | PaymentKind;

export default function PendingPayments() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, error, loading, reload } = useApi(
    () => api.adminPayments({ status: "pending", kind: filter === "all" ? undefined : filter }),
    [filter],
  );
  const selected = data?.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold">Pending Payments</h1>
          {data && <span className="rounded-full bg-coral px-2.5 py-0.5 text-xs font-bold text-white">{data.length}</span>}
        </div>
        <div className="mt-3">
          <Tabs
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setSelectedId(null);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "fee", label: "Fees" },
              { value: "pass", label: "Passes" },
            ]}
          />
        </div>
        <ul className="mt-3 space-y-2">
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorText>{error}</ErrorText>
          ) : !data?.length ? (
            <Empty>All caught up. No payments waiting.</Empty>
          ) : (
            data.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelectedId(p.id)}
                  className={cx(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    selectedId === p.id ? "border-[#8b7cf0] bg-white ring-2 ring-[#8b7cf0]/25" : "border-white/80 bg-white/70 hover:bg-white",
                  )}
                >
                  <span>
                    <span className="block font-bold">{p.studentId}</span>
                    <span className="text-ink-soft">{p.date}</span>
                  </span>
                  <span className="text-right">
                    <span className={cx("block font-bold", p.kind === "pass" ? "text-[#5b4fd6]" : "text-coral-dark")}>
                      {p.kind === "pass" ? "Pass" : "Fees"}
                    </span>
                    <span className="text-ink-soft">{money(p.amount)}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </Card>

      {selected ? (
        <Review key={selected.id} payment={selected} onDone={() => { setSelectedId(null); reload(); }} />
      ) : (
        <Card className="hidden items-center justify-center p-10 text-center text-ink-soft xl:flex">
          Select a payment on the left to check the slip and approve or reject it.
        </Card>
      )}
    </div>
  );
}

function Review({ payment: p, onDone }: { payment: Payment; onDone: () => void }) {
  const { data: lookup } = useApi(() => api.adminStudent(p.studentId), [p.studentId]);
  const [busy, setBusy] = useState<"approved" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(status: "approved" | "rejected") {
    setBusy(status);
    setError(null);
    try {
      await api.reviewPayment(p.id, status);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="text-lg font-extrabold">Payment slip</h2>
        <p className="text-sm text-ink-soft">
          {p.kind === "pass" ? "Vehicle pass" : "Fee"} · {money(p.amount)} · {p.date}
        </p>
        <div className="mt-4">
          <SlipPreview url={p.slipUrl} />
        </div>
      </Card>
      <div className="space-y-4">
        {lookup ? <StudentDetails lookup={lookup} /> : <Loading />}
        <ErrorText>{error}</ErrorText>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => decide("rejected")} loading={busy === "rejected"} disabled={!!busy} className="!border-bad/40 !text-bad">
            Reject
          </Button>
          <Button variant="primary" onClick={() => decide("approved")} loading={busy === "approved"} disabled={!!busy}>
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
