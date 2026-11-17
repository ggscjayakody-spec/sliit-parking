"use client";

import { LoginForm } from "@/components/LoginForm";
import { api } from "@/lib/api";

export default function AdminLogin() {
  return (
    <LoginForm
      role="admin"
      portal="Admin Portal"
      idLabel="Admin ID"
      idPlaceholder="ADMIN01"
      demo={{ id: "ADMIN01", password: "admin123" }}
      onLogin={api.adminLogin}
      redirectTo="/admin"
    />
  );
}
