"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ───────── Brand ───────── */

export function Logo({ size = 56 }: { size?: number }) {
  // Generic shield mark — swap for the official crest if you have permission to use it.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b3590" />
          <stop offset="1" stopColor="#1f1b5c" />
        </linearGradient>
      </defs>
      <path d="M32 4 56 12v18c0 15-10 25-24 30C18 55 8 45 8 30V12z" fill="url(#lg)" />
      <path d="M32 9 51 15.5V30c0 12-8 20.5-19 25-11-4.5-19-13-19-25V15.5z" fill="none" stroke="#f3b33d" strokeWidth="2" />
      <text x="32" y="41" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="inherit">
        P
      </text>
    </svg>
  );
}

/* ───────── Layout ───────── */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("glass rounded-2xl", className)}>{children}</div>;
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-lg font-semibold text-ink-soft">{subtitle}</p>}
    </div>
  );
}

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}

/* ───────── Controls ───────── */

type BtnVariant = "soft" | "primary" | "coral" | "ghost";

const btnBase =
  "lift inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold select-none disabled:opacity-50 disabled:pointer-events-none";
const btnVariants: Record<BtnVariant, string> = {
  soft: "bg-lilac-100/90 text-ink border border-lilac-300 hover:bg-white",
  primary: "bg-ink text-white hover:bg-[#2c277a] shadow-lg shadow-ink/20",
  coral: "bg-coral text-white hover:bg-coral-dark shadow-lg shadow-coral/25",
  ghost: "text-ink-soft hover:text-ink hover:bg-white/50",
};

export function Button({
  variant = "soft",
  className,
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button className={cx(btnBase, btnVariants[variant], className)} disabled={loading || rest.disabled} {...rest}>
      {loading && <Spinner small />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "soft",
  className,
  children,
}: {
  href: string;
  variant?: BtnVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(btnBase, btnVariants[variant], className)}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>
      <input className="field" {...rest} />
      {hint && <span className="mt-1 block text-xs text-ink-soft/80">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  children,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>
      <select className="field appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234b4785%22 stroke-width=%223%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_0.9rem_center] bg-no-repeat pr-9" {...rest}>
        {children}
      </select>
    </label>
  );
}

export function FileField({
  label,
  file,
  onFile,
  required,
  optional,
}: {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink-soft">
        {label}
        {optional && (
          <span className="ml-0.5 text-coral" aria-label="optional" title="Optional">
            *
          </span>
        )}
      </span>
      <span className="field flex cursor-pointer items-center gap-2 truncate">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-soft">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={cx("truncate", !file && "text-[#9a97c2]")}>{file ? file.name : "Upload bank slip (image or PDF)"}</span>
      </span>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        required={required}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-lilac-100/80 p-1 text-sm font-semibold">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full px-4 py-1.5 transition-colors",
            value === o.value ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input className="field pl-10" type="search" {...props} />
    </div>
  );
}

/* ───────── Feedback ───────── */

export function Spinner({ small }: { small?: boolean }) {
  return (
    <span
      className={cx("inline-block animate-spin rounded-full border-2 border-current border-r-transparent", small ? "h-4 w-4" : "h-6 w-6")}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-ink-soft">
      <Spinner /> <span className="font-semibold">{label}</span>
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm font-semibold text-bad">
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm font-semibold text-ink-soft/80">{children}</p>;
}

const badgeTone: Record<string, string> = {
  approved: "text-ok bg-ok/10",
  active: "text-ok bg-ok/10",
  paid: "text-ok bg-ok/10",
  pending: "text-warn bg-warn/10",
  rejected: "text-bad bg-bad/10",
  unpaid: "text-bad bg-bad/10",
  expired: "text-bad bg-bad/10",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize", badgeTone[status] ?? "bg-lilac-100 text-ink-soft")}>
      {status}
    </span>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8f86d8] to-[#4b4785] text-sm font-bold text-white">
      {initials}
    </span>
  );
}

export const money = (n: number) => `${n.toLocaleString("en-LK")}/=`;

export { cx };
