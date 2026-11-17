"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { Button, Card, Empty, ErrorText, Loading, SearchInput } from "@/components/ui";
import { StudentDetails } from "@/components/StudentDetails";
import { PaymentRow } from "@/components/PaymentRow";

export default function AdminStudents() {
  const [input, setInput] = useState("");
  const [id, setId] = useState("");
  const student = useApi(() => api.adminStudent(id), [id], !!id);
  const payments = useApi(() => api.adminPayments({ studentId: id }), [id], !!id);

  function search(e: FormEvent) {
    e.preventDefault();
    setId(input.trim().toUpperCase());
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <h1 className="text-2xl font-extrabold">Student Details</h1>
        <form onSubmit={search} className="mt-4 flex gap-3">
          <div className="flex-1">
            <SearchInput placeholder="Search ID Number or Vehicle Number" value={input} onChange={(e) => setInput(e.target.value)} />
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>
      </Card>

      {!id ? null : student.loading ? (
        <Loading />
      ) : student.error || !student.data ? (
        <ErrorText>{student.error}</ErrorText>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <StudentDetails lookup={student.data} />
          <Card className="p-5">
            <h2 className="text-lg font-extrabold">Payments</h2>
            <div className="mt-3 space-y-2">
              {payments.loading ? (
                <Loading />
              ) : !payments.data?.length ? (
                <Empty>No payments.</Empty>
              ) : (
                payments.data.map((p) => <PaymentRow key={p.id} payment={p} />)
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
