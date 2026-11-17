"use client";

import { LoginForm } from "@/components/LoginForm";
import { api } from "@/lib/api";

export default function EnforcerLogin() {
  return (
    <LoginForm
      role="enforcer"
      portal="Enforcer Portal"
      idLabel="Enforcer ID Number"
      idPlaceholder="EN0106"
      demo={{ id: "EN0106", password: "password123" }}
      onLogin={api.enforcerLogin}
      redirectTo="/enforcer"
      compact
    />
  );
}
