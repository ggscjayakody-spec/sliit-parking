"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { errorMessage, useApi } from "@/lib/hooks";
import type { Enforcer } from "@/lib/types";
import { Avatar, Button, Card, Empty, ErrorText, Field, Loading, SearchInput } from "@/components/ui";

/** Suggest the next free ID, e.g. EN0106 → EN0107. */
function nextId(list: Enforcer[] | null) {
  const nums = (list ?? []).map((e) => Number(/^EN(\d+)$/i.exec(e.id)?.[1])).filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 100) + 1;
  return `EN${String(next).padStart(4, "0")}`;
}

export default function Enforcers() {
  const { data, error, loading, reload } = useApi(api.adminEnforcers, []);
  const [q, setQ] = useState("");
  const [created, setCreated] = useState<Enforcer | null>(null);

  const needle = q.trim().toLowerCase();
  const rows = (data ?? []).filter((e) => !needle || e.id.toLowerCase().includes(needle) || e.fullName.toLowerCase().includes(needle));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <h1 className="text-2xl font-extrabold">Create Enforcer Account</h1>
        <p className="text-sm text-ink-soft">Enforcers can&apos;t sign up themselves. Create their login here and give them the ID and password.</p>

        {created ? (
          <div className="mt-5 rounded-xl border border-ok/30 bg-ok/10 p-4">
            <p className="font-extrabold text-ok">Account created</p>
            <p className="mt-1 text-sm">
              <span className="font-bold">{created.fullName}</span> can now log in at the Enforcer Portal with ID{" "}
              <span className="font-bold">{created.id}</span> and the password you set.
            </p>
            <Button className="mt-4" onClick={() => setCreated(null)}>
              Create another
            </Button>
          </div>
        ) : (
          <CreateForm
            key={data?.length ?? 0}
            suggestedId={nextId(data)}
            onCreated={(e) => {
              setCreated(e);
              reload();
            }}
          />
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-extrabold">
            Enforcers {data && <span className="text-base font-semibold text-ink-soft">({data.length})</span>}
          </h2>
          <div className="sm:w-64">
            <SearchInput placeholder="Search ID or name" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {loading && !data ? (
            <Loading />
          ) : error ? (
            <ErrorText>{error}</ErrorText>
          ) : rows.length === 0 ? (
            <Empty>{data?.length ? "No enforcers match." : "No enforcer accounts yet."}</Empty>
          ) : (
            rows.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/70 px-4 py-3">
                <Avatar name={e.fullName} />
                <div className="min-w-0">
                  <p className="truncate font-bold">{e.fullName}</p>
                  <p className="text-sm text-ink-soft">{e.id}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}

function CreateForm({ suggestedId, onCreated }: { suggestedId: string; onCreated: (e: Enforcer) => void }) {
  const [form, setForm] = useState({ id: suggestedId, fullName: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^EN\d{4}$/i.test(form.id.trim())) return setError("Enforcer ID should look like EN0107.");
    if (!form.fullName.trim()) return setError("Enter the enforcer's full name.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return setError("Passwords don't match.");
    setSaving(true);
    try {
      onCreated(await api.createEnforcer({ id: form.id.trim().toUpperCase(), fullName: form.fullName, password: form.password }));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <Field label="Enforcer ID Number" value={form.id} onChange={set("id")} autoCapitalize="characters" hint="Suggested next free ID. You can change it." required />
      <Field label="Full Name" value={form.fullName} onChange={set("fullName")} autoComplete="off" required />
      <Field label="Password" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" required />
      <Field label="Confirm Password" type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />
      <ErrorText>{error}</ErrorText>
      <Button type="submit" variant="primary" loading={saving} className="w-full">
        Create Account
      </Button>
    </form>
  );
}
