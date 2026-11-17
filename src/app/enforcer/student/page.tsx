"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { Fee } from "@/lib/types";
import { AddFeeForm } from "@/components/AddFeeForm";
import { BackLink, Button, ButtonLink, Card, ErrorText, hoursLabel, Loading, money } from "@/components/ui";
import { StudentDetails } from "@/components/StudentDetails";

export default function StudentResultPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StudentResult />
    </Suspense>
  );
}

/** Scan result: student details, then "Add Fees" opens the red form right here, as in the design. */
function StudentResult() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const viaParam = params.get("via");
  // Record the scan/search in the enforcer's activity once, not again when the page refreshes its data.
  const via = useRef<"scan" | "search" | undefined>(viaParam === "scan" || viaParam === "search" ? viaParam : undefined);
  const { data, error, loading, reload } = useApi(
    () => {
      const v = via.current;
      via.current = undefined;
      return api.lookupStudent(q, v);
    },
    [q],
    !!q,
  );
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState<Fee | null>(null);

  return (
    <>
      <BackLink href="/enforcer" />
      {loading && !data ? (
        <Loading label="Looking up student…" />
      ) : error || !data ? (
        <Card className="space-y-3 p-5">
          <ErrorText>{error ?? "Nothing to look up."}</ErrorText>
        </Card>
      ) : (
        <>
          <StudentDetails lookup={data} />
          {data.student.passStatus === "active" ? (
            <Card className="p-4 text-center">
              <p className="font-extrabold text-ok">Valid parking pass</p>
              <p className="text-sm text-ink-soft">No parking fee applies to this student.</p>
            </Card>
          ) : added ? (
            <Card className="p-4 text-center">
              <p className="font-extrabold text-ok">Fee added: {money(added.amount)}</p>
              <p className="text-sm text-ink-soft">Parking for {hoursLabel(added.hours)}</p>
              <Button className="mt-3" onClick={() => { setAdded(null); setAdding(true); }}>
                Add another fee
              </Button>
            </Card>
          ) : adding ? (
            <AddFeeForm
              student={data.student}
              onAdded={(fee) => {
                setAdding(false);
                setAdded(fee);
                reload();
              }}
            />
          ) : (
            <Button variant="coral" className="w-full" onClick={() => setAdding(true)}>
              Add Fees
            </Button>
          )}
        </>
      )}
      <ButtonLink href="/enforcer/scan" className="w-full">
        Scan Again
      </ButtonLink>
    </>
  );
}
