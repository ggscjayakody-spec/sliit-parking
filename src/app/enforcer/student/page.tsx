"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { BackLink, ButtonLink, Card, ErrorText, Loading } from "@/components/ui";
import { StudentDetails } from "@/components/StudentDetails";

export default function StudentResultPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StudentResult />
    </Suspense>
  );
}

function StudentResult() {
  const q = useSearchParams().get("q") ?? "";
  const { data, error, loading } = useApi(() => api.lookupStudent(q), [q], !!q);

  return (
    <>
      <BackLink href="/enforcer" />
      {loading ? (
        <Loading label="Looking up student…" />
      ) : error || !data ? (
        <Card className="space-y-3 p-5">
          <ErrorText>{error ?? "Nothing to look up."}</ErrorText>
        </Card>
      ) : (
        <>
          <StudentDetails lookup={data} />
          <ButtonLink href={`/enforcer/add-fee?id=${encodeURIComponent(data.student.id)}`} variant="coral" className="w-full">
            Add Fees
          </ButtonLink>
        </>
      )}
      <ButtonLink href="/enforcer/scan" className="w-full">
        Scan Again
      </ButtonLink>
    </>
  );
}
