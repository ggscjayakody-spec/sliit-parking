"use client";

import type { ReactNode } from "react";
import type { Payment } from "@/lib/types";
import { money, StatusBadge } from "./ui";

/** One row like "250/= | 2026-11-04 | Fees | View Upload | Approved" from the design. */
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
  return (
    <Tag
      onClick={onClick}
      className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-xl border bg-white/70 px-4 py-3 text-left text-sm sm:grid-cols-[7rem_7rem_5rem_1fr_auto] ${
        selected ? "border-[#8b7cf0] ring-2 ring-[#8b7cf0]/25" : "border-white/80"
      } ${onClick ? "transition-colors hover:bg-white" : ""}`}
    >
      <span className="font-bold">{showStudent ? p.studentId : money(p.amount)}</span>
      <span className="text-right text-ink-soft sm:text-left">{p.date}</span>
      <span className="text-ink-soft">{p.kind === "pass" ? "Pass" : "Fees"}{showStudent && ` · ${money(p.amount)}`}</span>
      <span className="text-right sm:text-left">
        {p.slipUrl ? (
          <a
            href={p.slipUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-[#5b4fd6] underline underline-offset-2"
          >
            View Upload
          </a>
        ) : (
          <span className="text-ink-soft/60">No upload</span>
        )}
      </span>
      <span className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
        {actions ?? <StatusBadge status={p.status} />}
      </span>
    </Tag>
  );
}
