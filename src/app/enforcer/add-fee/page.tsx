"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Fee, Student } from "@/lib/types";
import { AddFeeForm } from "@/components/AddFeeForm";
import { BackLink, Button, Card, money } from "@/components/ui";

/** Add Fees opened straight from the enforcer home: the red form, asking who the fee is for. */
export default function AddFee() {
  const router = useRouter();
  const [done, setDone] = useState<{ fee: Fee; student: Student } | null>(null);

  return (
    <>
      <BackLink href="/enforcer" />
      {done ? (
        <Card className="p-6 text-center">
          <p className="text-2xl font-extrabold">Fee added</p>
          <p className="mt-1 text-ink-soft">
            {money(done.fee.amount)} charged to {done.student.fullName} ({done.student.vehicleNumber}).
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button onClick={() => setDone(null)}>Add another</Button>
            <Button variant="primary" onClick={() => router.push("/enforcer/fees")}>
              View Fees
            </Button>
          </div>
        </Card>
      ) : (
        <AddFeeForm onAdded={(fee, student) => setDone({ fee, student })} />
      )}
    </>
  );
}
