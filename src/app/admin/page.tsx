"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import type { Payment, PaymentKind } from "@/lib/types";
import { Button, ButtonLink, Card, cx, Empty, ErrorText, Loading, money, SearchInput, Tabs } from "@/components/ui";
import { StudentDetails } from "@/components/StudentDetails";
import { SlipPreview } from "@/components/SlipPreview";
import { PaymentRow } from "@/components/PaymentRow";

type Filter = "all" | PaymentKind;
type View = { mode: "payment"; id: string } | { mode: "student"; id: string } | null;

/**
 * Admin home, as in the design: Pending Payments on the left, Student Details (with ID search)
 * on the right, and a Payment History button underneath.
 */
export default function AdminHome() {
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>(null);
  const [search, setSearch] = useState("");
  const pending = useApi(() => api.adminPayments({ status: "pending", kind: filter === "all" ? undefined : filter }), [filter]);
  const selectedPayment = view?.mode === "payment" ? (pending.data?.find((p) => p.id === view.id) ?? null) : null;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const id = search.trim().toUpperCase();
    if (id) setView({ mode: "student", id });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
      {/* ── Pending Payments ── */}
      <Card className="self-start p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold">Pending Payments</h1>
          {pending.data && <span className="rounded-full bg-coral px-2.5 py-0.5 text-xs font-bold text-white">{pending.data.length}</span>}
        </div>
        <div className="mt-3">
          <Tabs
            value={filter}
            onChange={(v) => {
              setFilter(v);
              if (view?.mode === "payment") setView(null);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "fee", label: "Fees" },
              { value: "pass", label: "Passes" },
            ]}
          />
        </div>
        <ul className="mt-3 space-y-2">
          {pending.loading && !pending.data ? (
            <Loading />
          ) : pending.error ? (
            <ErrorText>{pending.error}</ErrorText>
          ) : !pending.data?.length ? (
            <Empty>All caught up. No payments waiting.</Empty>
          ) : (
            pending.data.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setView({ mode: "payment", id: p.id });
                    setSearch(p.studentId);
                  }}
                  className={cx(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    view?.mode === "payment" && view.id === p.id
                      ? "border-[#8b7cf0] bg-white ring-2 ring-[#8b7cf0]/25"
                      : "border-white/80 bg-white/70 hover:bg-white",
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

      {/* ── Student Details ── */}
      <div className="space-y-4">
        <Card className="@container p-5">
          <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
            <h2 className="text-xl font-extrabold">Student Details</h2>
            <form onSubmit={onSearch} className="flex gap-2 @lg:w-80">
              <div className="flex-1">
                <SearchInput placeholder="Search ID Number" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button type="submit" variant="primary">
                Search
              </Button>
            </form>
          </div>

          <div className="mt-5">
            {selectedPayment ? (
              <Review
                key={selectedPayment.id}
                payment={selectedPayment}
                onDone={() => {
                  setView({ mode: "student", id: selectedPayment.studentId });
                  pending.reload();
                }}
              />
            ) : view?.mode === "student" ? (
              <StudentPanel key={view.id} id={view.id} />
            ) : (
              <Empty>Pick a pending payment, or search an IT number or vehicle number to see a student.</Empty>
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <ButtonLink href="/admin/history" className="min-w-48">
            Payment History
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

/** A pending payment: slip on one side, the student and Approve / Reject on the other. */
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
    <div className="grid gap-5 @xl:grid-cols-2">
      <div>
        <p className="font-extrabold">Payment slip</p>
        <p className="text-sm text-ink-soft">
          {p.kind === "pass" ? "Vehicle pass" : "Fee"} · {money(p.amount)} · {p.date}
        </p>
        <div className="mt-3">
          <SlipPreview url={p.slipUrl} />
        </div>
      </div>
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

/** A searched student: their details and all their payments. */
function StudentPanel({ id }: { id: string }) {
  const student = useApi(() => api.adminStudent(id), [id]);
  const payments = useApi(() => api.adminPayments({ studentId: student.data?.student.id ?? id }), [student.data?.student.id ?? id], !!student.data);

  if (student.loading) return <Loading />;
  if (student.error || !student.data) return <ErrorText>{student.error}</ErrorText>;

  return (
    <div className="grid gap-5 @xl:grid-cols-2">
      <StudentDetails lookup={student.data} />
      <div>
        <p className="font-extrabold">Payments</p>
        <div className="mt-3 space-y-2">
          {payments.loading ? <Loading /> : !payments.data?.length ? <Empty>No payments.</Empty> : payments.data.map((p) => <PaymentRow key={p.id} payment={p} showKind />)}
        </div>
      </div>
    </div>
  );
}
