"use client";

import { USING_MOCK } from "@/lib/api";

export function MockBanner() {
  if (!USING_MOCK) return null;
  return (
    <div className="bg-ink/90 px-4 py-1.5 text-center text-xs font-semibold text-white">
      Demo mode: using sample data. Set <code className="rounded bg-white/15 px-1">NEXT_PUBLIC_API_URL</code> to connect the real backend.
    </div>
  );
}
