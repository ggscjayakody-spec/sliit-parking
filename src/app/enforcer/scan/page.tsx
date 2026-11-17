"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { QrScanner } from "@/components/QrScanner";
import { BackLink, Card, SearchInput } from "@/components/ui";

export default function Scan() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (text: string, via: "scan" | "search" = "scan") =>
    router.push(`/enforcer/student?q=${encodeURIComponent(text)}&via=${via}`);

  function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim()) go(q.trim(), "search");
  }

  return (
    <>
      <BackLink href="/enforcer" />
      <Card className="p-3">
        <QrScanner onScan={go} />
        <p className="mt-3 text-center text-sm font-semibold text-ink-soft">Point the camera at the student&apos;s vehicle pass QR</p>
      </Card>
      <form onSubmit={search}>
        <SearchInput placeholder="Or type Student ID / Vehicle Number" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
      </form>
    </>
  );
}
