"use client";

import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { BackLink, Card, Empty, ErrorText, Loading } from "@/components/ui";
import { PaymentRow } from "@/components/PaymentRow";

export default function PaymentHistory() {
  const { data, error, loading } = useApi(api.myPayments, []);

  return (
    <div className="space-y-4">
      <BackLink href="/student" />
      <Card className="p-5 sm:p-6">
        <h1 className="text-2xl font-extrabold">Payment History</h1>
        <p className="text-sm text-ink-soft">Every slip you&apos;ve uploaded and whether it&apos;s been approved.</p>
        <div className="mt-5 space-y-2">
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorText>{error}</ErrorText>
          ) : !data?.length ? (
            <Empty>No payments yet.</Empty>
          ) : (
            data.map((p) => <PaymentRow key={p.id} payment={p} />)
          )}
        </div>
      </Card>
    </div>
  );
}
