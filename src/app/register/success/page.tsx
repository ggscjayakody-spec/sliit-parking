"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink, Card } from "@/components/ui";

export default function RegisterSuccessPage() {
  return (
    <Suspense>
      <RegisterSuccess />
    </Suspense>
  );
}

function RegisterSuccess() {
  const withSlip = useSearchParams().get("slip") === "1";
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-10">
      <Card className="w-full max-w-md px-8 py-10 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok text-white shadow-lg shadow-ok/30">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="mt-5 text-3xl font-extrabold text-ink">Successfully Registered!</h1>
        <p className="mt-2 text-ink-soft">
          {withSlip
            ? "Your payment slip has been sent for approval. Your QR vehicle pass will appear once an admin approves it. Please log in below."
            : "You didn't upload a payment slip, so your vehicle pass is pending. Log in and upload it from Pay Fees to get your QR pass."}
        </p>
        <ButtonLink href="/login" variant="primary" className="mt-6 min-w-36">
          Log in
        </ButtonLink>
      </Card>
    </main>
  );
}
