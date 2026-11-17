"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { StudentCtx } from "@/components/StudentContext";
import { api } from "@/lib/api";
import { useApi, useLogout, useRequireRole } from "@/lib/hooks";
import { Avatar, Card, cx, ErrorText, Loading, Logo, StatusBadge } from "@/components/ui";

const NAV = [
  { href: "/student", label: "Vehicle Pass" },
  { href: "/student/pay", label: "Pay Fees" },
  { href: "/student/payments", label: "Payment History" },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const ready = useRequireRole("student");
  const logout = useLogout("student");
  const pathname = usePathname();
  const { data: student, error, reload } = useApi(api.me, [], ready);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 md:flex-row md:py-10">
      <aside className="md:w-64 md:shrink-0">
        <Card className="p-5 md:sticky md:top-6">
          <Link href="/" className="mb-5 flex items-center gap-2">
            <Logo size={28} />
            <span className="font-extrabold tracking-tight">SLIIT PARKING</span>
          </Link>
          {student ? (
            <div className="flex items-center gap-3">
              <Avatar name={student.fullName} />
              <div className="min-w-0">
                <p className="truncate font-bold">{student.fullName}</p>
                <p className="text-sm text-ink-soft">{student.id}</p>
              </div>
            </div>
          ) : (
            <div className="h-11 animate-pulse rounded-lg bg-lilac-100" />
          )}
          {student && (
            <dl className="mt-4 grid grid-cols-2 gap-y-2 border-t border-lilac-200 pt-4 text-sm">
              <dt className="text-ink-soft">Vehicle</dt>
              <dd className="text-right font-semibold">{student.vehicleNumber}</dd>
              <dt className="text-ink-soft">Type</dt>
              <dd className="text-right font-semibold">{student.vehicleType}</dd>
              <dt className="text-ink-soft">Pass</dt>
              <dd className="text-right">
                <StatusBadge status={student.passStatus} />
              </dd>
            </dl>
          )}
          <nav className="mt-5 flex gap-1 overflow-x-auto md:flex-col">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  pathname === n.href ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:bg-white/50 hover:text-ink",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="mt-4 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-bad hover:bg-bad/10">
            Log out
          </button>
        </Card>
      </aside>

      <main className="min-w-0 flex-1">
        {error ? (
          <ErrorText>{error}</ErrorText>
        ) : !student ? (
          <Loading />
        ) : (
          <StudentCtx.Provider value={{ student, reload }}>{children}</StudentCtx.Provider>
        )}
      </main>
    </div>
  );
}
