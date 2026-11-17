"use client";

import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { ButtonLink, Card, Logo, money } from "@/components/ui";
import { useStudent } from "@/components/StudentContext";

export default function StudentPass() {
  const { student } = useStudent();
  const { data: fees } = useApi(api.myFees, []);
  const { data: payments } = useApi(api.myPayments, []);
  const slipAwaitingApproval = (payments ?? []).some((p) => p.kind === "pass" && p.status === "pending");
  const unpaid = (fees ?? []).filter((f) => f.status === "unpaid");

  return (
    <div className="space-y-5">
      {unpaid.length > 0 && (
        <div className="bg-mesh-coral flex flex-col gap-3 rounded-2xl p-5 text-white shadow-lg shadow-coral/30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-extrabold">
              You have {unpaid.length} unpaid fee{unpaid.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-white/90">
              Total {money(unpaid.reduce((s, f) => s + f.amount, 0))}. Unpaid fees can block your vehicle pass.
            </p>
          </div>
          <ButtonLink href="/student/pay" className="!bg-white !text-coral-dark !border-white">
            Pay now
          </ButtonLink>
        </div>
      )}

      <Card className="overflow-hidden">
        {student.passStatus === "active" && student.qrToken ? (
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
            <div className="mx-auto flex flex-col items-center">
              <div className="rounded-2xl bg-white p-4 shadow-md">
                <QRCodeSVG value={student.qrToken} size={200} level="M" fgColor="#1f1b5c" />
              </div>
              <p className="mt-3 text-xl font-extrabold tracking-wide">VEHICLE PASS</p>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Logo size={30} />
                <span className="text-lg font-extrabold">SLIIT PARKING</span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:text-base">
                <Item k="Student Name" v={student.fullName} />
                <Item k="Student ID" v={student.id} />
                <Item k="Vehicle No" v={student.vehicleNumber} />
                <Item k="Vehicle Type" v={student.vehicleType} />
                <Item k="Pass Validity" v={student.passValidUntil ?? "—"} />
                <Item k="Status" v={<span className="font-bold text-ok">Active</span>} />
              </dl>
              <p className="mt-auto pt-5 text-sm text-ink-soft">
                Show this QR code to a parking enforcer when asked. Tip: screenshot it for offline use.
              </p>
            </div>
          </div>
        ) : (
          <PassNotReady status={student.passStatus} slipSent={slipAwaitingApproval} loading={!payments} />
        )}
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <ButtonLink href="/student/payments">Payment History</ButtonLink>
        <ButtonLink href="/student/pay" variant="coral">
          Pay Fees
        </ButtonLink>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-ink-soft">{k}</dt>
      <dd className="font-bold">{v}</dd>
    </div>
  );
}

function PassNotReady({ status, slipSent, loading }: { status: string; slipSent: boolean; loading: boolean }) {
  const copy =
    status === "rejected" && !slipSent
      ? { title: "Vehicle pass payment rejected", body: "Your payment slip couldn't be verified." }
      : status === "expired" && !slipSent
        ? { title: "Vehicle pass expired", body: "Renew your pass by paying the pass fee." }
        : { title: "Vehicle Pass Pending…", body: "Awaiting Payment Verification" };

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <p className="text-xl italic text-ink-soft">{copy.title}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{copy.body}</p>
      {loading ? null : slipSent ? (
        <p className="mt-6 max-w-sm text-sm text-ink-soft">
          Your payment slip has been sent. Your QR pass will appear here as soon as an admin approves it.
        </p>
      ) : (
        <>
          <p className="mt-6 max-w-sm text-sm text-ink-soft">
            {status === "rejected" ? "Please upload a new, clear photo of your payment slip." : "Upload your vehicle pass payment slip so an admin can approve your QR pass."}
          </p>
          <ButtonLink href="/student/pay" variant="coral" className="mt-3">
            Upload payment slip
          </ButtonLink>
        </>
      )}
    </div>
  );
}
