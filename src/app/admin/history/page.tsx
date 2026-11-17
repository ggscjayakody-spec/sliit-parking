"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { PaymentKind } from "@/lib/types";
import { Card, Empty, ErrorText, Loading, SearchInput, Tabs } from "@/components/ui";
import { PaymentRow } from "@/components/PaymentRow";

type Filter = "all" | PaymentKind;

export default function AdminHistory() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const { data, error, loading } = useApi(
    () => api.adminPayments({ kind: filter === "all" ? undefined : filter, studentId: q.trim() || undefined }),
    [filter, q],
  );

  return (
    <Card className="p-5 sm:p-6">
      <h1 className="text-2xl font-extrabold">Payment History</h1>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "fee", label: "Fees" },
            { value: "pass", label: "Passes" },
          ]}
        />
        <div className="sm:w-72">
          <SearchInput placeholder="Search ID Number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorText>{error}</ErrorText>
        ) : !data?.length ? (
          <Empty>No payments match.</Empty>
        ) : (
          data.map((p) => <PaymentRow key={p.id} payment={p} showStudent />)
        )}
      </div>
    </Card>
  );
}
