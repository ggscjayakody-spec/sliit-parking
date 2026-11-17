"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ButtonLink, Card, SearchInput } from "@/components/ui";

export default function EnforcerHome() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/enforcer/student?q=${encodeURIComponent(q.trim())}&via=search`);
  }

  return (
    <>
      <Link href="/enforcer/scan" className="lift block">
        <Card className="flex aspect-square flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="relative h-40 w-40">
            <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-ink" />
            <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-ink" />
            <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-ink" />
            <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-ink" />
            <svg className="absolute inset-0 m-auto text-ink-soft" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-lg font-bold text-ink-soft">Click here to Scan QR Code</p>
        </Card>
      </Link>

      <form onSubmit={search}>
        <SearchInput placeholder="Search Student ID / Vehicle Number" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
      </form>

      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href="/enforcer/fees">View Fees</ButtonLink>
        <ButtonLink href="/enforcer/add-fee" variant="coral">
          Add Fees
        </ButtonLink>
      </div>
    </>
  );
}
