"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { FeeStatus } from "@/lib/types";
import { BackLink, Card, Empty, ErrorText, Loading, money, SearchInput, StatusBadge, Tabs } from "@/components/ui";

type Filter = "all" | FeeStatus;

export default function IssuedFees() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const { data, error, loading } = useApi(() => api.issuedFees(filter === "all" ? undefined : filter), [filter]);

  const needle = q.trim().toUpperCase();
  const rows = (data ?? []).filter((f) => !needle || f.studentId.includes(needle) || f.vehicleNumber.toUpperCase().includes(needle));

  return (
    <>
      <BackLink href="/enforcer" />
      <Card className="p-4">
        <div className="flex justify-center">
          <Tabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "unpaid", label: "Unpaid" },
              { value: "paid", label: "Paid" },
            ]}
          />
        </div>
        <div className="mt-3">
          <SearchInput placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul className="mt-3 space-y-2">
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorText>{error}</ErrorText>
          ) : rows.length === 0 ? (
            <Empty>No fees here.</Empty>
          ) : (
            rows.map((f) => (
              <li key={f.id} className="rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">{f.vehicleNumber}</span>
                  <span className="text-ink-soft">{f.date}</span>
                  <StatusBadge status={f.status} />
                </div>
                <p className="mt-1 truncate text-ink-soft">
                  {money(f.amount)} · {f.reason} · {f.studentId}
                </p>
              </li>
            ))
          )}
        </ul>
      </Card>
    </>
  );
}
