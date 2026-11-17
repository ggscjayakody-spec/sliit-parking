"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import { useApi, useLogout, useRequireRole } from "@/lib/hooks";
import { Avatar, Card, Loading } from "@/components/ui";

/** Enforcer screens are phone-first: a single narrow column, like the design. */
export default function EnforcerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/enforcer/login") return <>{children}</>;
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const ready = useRequireRole("enforcer");
  const logout = useLogout("enforcer");
  const { data: me } = useApi(api.enforcerMe, [], ready);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
      <Card className="flex items-center gap-3 px-4 py-3">
        {me ? <Avatar name={me.fullName} /> : <span className="h-11 w-11 animate-pulse rounded-full bg-lilac-100" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{me?.fullName ?? "…"}</p>
          <p className="text-sm text-ink-soft">{me?.id}</p>
        </div>
        <button onClick={logout} className="rounded-full px-3 py-1.5 text-sm font-semibold text-bad hover:bg-bad/10">
          Log out
        </button>
      </Card>
      {ready ? children : <Loading />}
    </div>
  );
}
