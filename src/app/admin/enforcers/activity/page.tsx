"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { ActivityAction, ActivityItem } from "@/lib/types";
import { Avatar, BackLink, Card, cx, Empty, ErrorText, hoursLabel, Loading, money, StatusBadge, Tabs } from "@/components/ui";

export default function EnforcerActivityPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EnforcerActivity />
    </Suspense>
  );
}

type Filter = "all" | "lookups" | "fee";

/** What one enforcer has been doing: QR scans, searches and fees added. */
function EnforcerActivity() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error, loading } = useApi(() => api.enforcerActivity(id), [id], !!id);
  const [filter, setFilter] = useState<Filter>("all");

  const items = (data?.items ?? []).filter((i) =>
    filter === "all" ? true : filter === "fee" ? i.action === "fee" : i.action === "scan" || i.action === "search",
  );

  return (
    <div className="space-y-4">
      <BackLink href="/admin/enforcers" label="Enforcers" />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorText>{error ?? "Choose an enforcer."}</ErrorText>
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <Avatar name={data.enforcer.fullName} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-extrabold">{data.enforcer.fullName}</h1>
              <p className="text-sm text-ink-soft">
                {data.enforcer.id} · Account created {data.enforcer.createdAt}
                {data.summary.lastActive && ` · Last active ${data.summary.lastActive.slice(0, 16)}`}
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Today" value={data.summary.today} hint="actions" />
            <Stat label="QR scans" value={data.summary.scans} />
            <Stat label="Searches" value={data.summary.searches} />
            <Stat label="Fees added" value={data.summary.fees} />
            <Stat label="Fees total" value={money(data.summary.feeTotal)} />
          </div>

          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-extrabold">Activity</h2>
              <Tabs
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "lookups", label: "Scans & searches" },
                  { value: "fee", label: "Fees" },
                ]}
              />
            </div>
            <ul className="mt-4 space-y-2">
              {items.length === 0 ? <Empty>No activity yet.</Empty> : items.map((i) => <Row key={i.id} item={i} />)}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">
        {value}
        {hint && <span className="ml-1 text-sm font-semibold text-ink-soft">{hint}</span>}
      </p>
    </Card>
  );
}

const ICON: Record<ActivityAction, { label: string; tone: string; path: string }> = {
  scan: {
    label: "Scanned QR",
    tone: "bg-[#5b4fd6]/10 text-[#5b4fd6]",
    path: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 8h3v3H8zM13 13h3v3h-3z",
  },
  search: { label: "Searched", tone: "bg-lilac-200/60 text-ink-soft", path: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5" },
  fee: { label: "Added fee", tone: "bg-coral/15 text-coral-dark", path: "M12 5v14M5 12h14" },
};

function Row({ item: i }: { item: ActivityItem }) {
  const icon = ICON[i.action];
  const who = i.studentId ? (
    <>
      <span className="font-bold">{i.studentName}</span>{" "}
      <span className="text-ink-soft">
        ({i.studentId} · {i.vehicleNumber})
      </span>
    </>
  ) : (
    <span className="text-bad">no student found</span>
  );

  return (
    <li className="flex items-start gap-3 rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-sm">
      <span className={cx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", icon.tone)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon.path} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p>
          <span className="font-semibold">{icon.label}</span>
          {i.action === "search" && i.query && <span className="text-ink-soft"> &ldquo;{i.query}&rdquo;</span>}
          {i.action === "fee" && i.amount != null && (
            <span className="font-semibold">
              {" "}
              {money(i.amount)}
              {i.hours != null && ` · ${hoursLabel(i.hours)}`}
            </span>
          )}{" "}
          → {who}
        </p>
        <p className="text-xs text-ink-soft">{i.at}</p>
      </div>
      {i.action === "fee" && i.feeStatus && <StatusBadge status={i.feeStatus} />}
    </li>
  );
}
