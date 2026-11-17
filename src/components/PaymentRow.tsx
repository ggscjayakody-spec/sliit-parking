"use client";

import type { ReactNode } from "react";
import type { Payment } from "@/lib/types";
import { money, StatusBadge } from "./ui";

/**
 * One row like "250/= | 2026-11-04 | Fees | View Upload | Approved" from the design.
 * Lays out by the width of the card it sits in (container query), not the screen,
 * so it fits both full-width lists and narrow side cards.
 */
export function PaymentRow({
  payment: p,
  showStudent,
  actions,
  onClick,
  selected,
}: {
  payment: Payment;
  showStudent?: boolean;
  actions?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  const Tag = onClick ? "button" : "div";
  const slip = p.slipUrl ? (
    <a
      href={p.slipUrl}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="whitespace-nowrap font-semibold text-[#5b4fd6] underline underline-offset-2"
    >
      View Upload
    </a>
  ) : (
    <span className="whitespace-nowrap text-ink-soft/60">No upload</span>
  );

  return (
    <div className="@container">
      <Tag
        onClick={onClick}
        className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-xl border bg-white/70 px-4 py-3 text-left text-sm @xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] ${
          selected ? "border-[#8b7cf0] ring-2 ring-[#8b7cf0]/25" : "border-white/80"
        } ${onClick ? "transition-colors hover:bg-white" : ""}`}
      >
        {/* Narrow: two lines — "250/=  [Approved]" / "2026-11-04 · Fees   View Upload" */}
        <span className="truncate font-bold">{showStudent ? p.studentId : money(p.amount)}</span>
        <span className="hidden truncate text-ink-soft @xl:block">{p.date}</span>
        <span className="hidden truncate text-ink-soft @xl:block">
          {p.kind === "pass" ? "Pass" : "Fees"}
          {showStudent && ` · ${money(p.amount)}`}
        </span>
        <span className="hidden @xl:block">{slip}</span>
        <span className="flex items-center justify-end gap-2">{actions ?? <StatusBadge status={p.status} />}</span>

        <span className="truncate text-ink-soft @xl:hidden">
          {p.date} · {p.kind === "pass" ? "Pass" : "Fees"}
          {showStudent && ` · ${money(p.amount)}`}
        </span>
        <span className="text-right @xl:hidden">{slip}</span>
      </Tag>
    </div>
  );
}
