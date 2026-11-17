"use client";

import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { api } from "@/lib/api";

export default function StudentLogin() {
  return (
    <LoginForm
      role="student"
      idLabel="IT Number"
      idPlaceholder="IT26123567"
      demo={{ id: "IT26123567", password: "password123" }}
      onLogin={api.studentLogin}
      redirectTo="/student"
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-bold text-ink underline underline-offset-4">
            Register your vehicle
          </Link>
        </>
      }
    />
  );
}
