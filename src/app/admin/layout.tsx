"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import { useApi, useLogout, useRequireRole } from "@/lib/hooks";
import { Avatar, Card, cx, Loading, Logo } from "@/components/ui";

const NAV = [
  { href: "/admin", label: "Pending Payments" },
  { href: "/admin/history", label: "Payment History" },
  { href: "/admin/students", label: "Student Details" },
  { href: "/admin/enforcers", label: "Enforcers" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;
  return <Shell pathname={pathname}>{children}</Shell>;
}

function Shell({ children, pathname }: { children: ReactNode; pathname: string }) {
  const ready = useRequireRole("admin");
  const logout = useLogout("admin");
  const { data: me } = useApi(api.adminMe, [], ready);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 md:flex-row md:py-8">
      <aside className="md:w-60 md:shrink-0">
        <Card className="p-5 md:sticky md:top-6">
          <div className="mb-5 flex items-center gap-2">
            <Logo size={28} />
            <div className="leading-tight">
              <p className="font-extrabold">SLIIT Parking</p>
              <p className="text-xs font-bold tracking-widest text-ink-soft">ADMIN</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {me ? <Avatar name={me.fullName} /> : <span className="h-11 w-11 animate-pulse rounded-full bg-lilac-100" />}
            <div className="min-w-0">
              <p className="truncate font-bold">{me?.fullName ?? "…"}</p>
              <p className="text-sm text-ink-soft">{me?.id}</p>
            </div>
          </div>
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
      <main className="min-w-0 flex-1">{ready ? children : <Loading />}</main>
    </div>
  );
}
