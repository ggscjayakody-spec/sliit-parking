"use client";

import type { StudentLookup } from "@/lib/types";
import { Card, cx, money } from "./ui";

/** The "Student ID / Status / Vehicle No / …" card from the enforcer scan result. */
export function StudentDetails({ lookup: { student: s, overdueFees } }: { lookup: StudentLookup }) {
  const overdueTotal = overdueFees.reduce((a, f) => a + f.amount, 0);
  const statusTone = s.passStatus === "active" ? "text-ok" : s.passStatus === "pending" ? "text-warn" : "text-bad";

  return (
    <Card className="p-5">
      <div
        className={cx(
          "mb-4 rounded-xl px-4 py-3 text-center text-lg font-extrabold capitalize",
          s.passStatus === "active" ? "bg-ok/10 text-ok" : s.passStatus === "pending" ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad",
        )}
      >
        {s.passStatus === "active" ? "✓ Valid pass" : `Pass ${s.passStatus}`}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Row k="Student ID:" v={s.id} />
        <Row k="Status:" v={<span className={cx("capitalize", statusTone)}>{s.passStatus}</span>} />
        <Row k="Vehicle No:" v={s.vehicleNumber} />
        <Row k="Vehicle Type:" v={s.vehicleType} />
        <Row k="Pass Validity:" v={s.passValidUntil ?? "—"} />
        <Row k="Contact:" v={<a href={`tel:${s.contact}`} className="underline underline-offset-2">{s.contact}</a>} />
        <Row k="Student Name:" v={s.fullName} />
        <Row
          k="Overdue Fees:"
          v={overdueFees.length ? <span className="text-bad">{money(overdueTotal)} ({overdueFees.length})</span> : <span className="text-ok">None</span>}
        />
      </dl>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="font-semibold text-ink-soft">{k}</dt>
      <dd className="font-bold">{v}</dd>
    </div>
  );
}
