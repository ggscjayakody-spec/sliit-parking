"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { setSession } from "@/lib/session";
import { errorMessage } from "@/lib/hooks";
import { USING_MOCK } from "@/lib/api";
import type { LoginResult, Role } from "@/lib/types";
import { BackLink, Button, Card, ErrorText, Field, PageTitle } from "./ui";

export function LoginForm({
  role,
  portal,
  idLabel,
  idPlaceholder,
  demo,
  onLogin,
  redirectTo,
  footer,
  compact,
}: {
  role: Role;
  portal?: string;
  /** Leave out for a password-only login (the admin portal). */
  idLabel?: string;
  idPlaceholder?: string;
  demo: { id?: string; password: string };
  onLogin: (id: string, password: string) => Promise<LoginResult>;
  redirectTo: string;
  footer?: React.ReactNode;
  compact?: boolean;
}) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await onLogin(id, password);
      setSession({ role, token: r.token, userId: r.userId });
      router.replace(redirectTo);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-10">
      <div className={compact ? "w-full max-w-sm" : "w-full max-w-md"}>
        <div className="mb-6">
          <BackLink href="/" />
        </div>
        <PageTitle title="LOG IN" subtitle="To SLIIT Parking" />
        {portal && <p className="mt-1 text-center text-sm font-bold uppercase tracking-widest text-ink-soft">{portal}</p>}

        <Card className="mt-6 p-6">
          <form onSubmit={submit} className="space-y-4">
            {idLabel && (
              <Field
                label={idLabel}
                placeholder={idPlaceholder}
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoComplete="username"
                autoCapitalize="characters"
                required
              />
            )}
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <ErrorText>{error}</ErrorText>
            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              LOG IN
            </Button>
          </form>
          {footer && <div className="mt-4 text-center text-sm text-ink-soft">{footer}</div>}
        </Card>

        {USING_MOCK && (
          <button
            type="button"
            onClick={() => {
              setId(demo.id ?? "");
              setPassword(demo.password);
            }}
            className="mx-auto mt-4 block text-xs font-semibold text-ink-soft underline decoration-dotted underline-offset-4 hover:text-ink"
          >
            Fill demo login ({demo.id ? `${demo.id} / ` : "password: "}{demo.password})
          </button>
        )}
      </div>
    </main>
  );
}
