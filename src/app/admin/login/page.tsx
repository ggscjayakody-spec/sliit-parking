"use client";

import { LoginForm } from "@/components/LoginForm";
import { api } from "@/lib/api";

export default function AdminLogin() {
  return (
    <LoginForm
      role="admin"
      portal="Admin Portal"
      demo={{ password: "admin123" }}
      onLogin={(_id, password) => api.adminLogin(password)}
      redirectTo="/admin"
    />
  );
}
