"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "./errors";
import { clearSession, getSession, loginPathFor } from "./session";
import type { Role } from "./types";

const noSubscribe = () => () => {};

/** Sends the user to the right login page if they are not signed in as `role`. */
export function useRequireRole(role: Role) {
  const router = useRouter();
  const ok = useSyncExternalStore(
    noSubscribe,
    () => getSession()?.role === role,
    () => false,
  );
  useEffect(() => {
    if (getSession()?.role !== role) router.replace(loginPathFor(role));
  }, [role, router]);
  return ok;
}

export function useLogout(role: Role) {
  const router = useRouter();
  return useCallback(() => {
    clearSession();
    router.replace(loginPathFor(role));
  }, [role, router]);
}

/**
 * Runs an API call, tracks loading/error, and re-runs when deps change.
 * Ignores out-of-order responses and sends the user to login on a 401.
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[], enabled = true) {
  const router = useRouter();
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  const [nonce, setNonce] = useState(0);
  const reqKey = `${JSON.stringify(deps)}#${nonce}`;
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null }>({
    key: "",
    data: null,
    error: null,
  });
  const [override, setOverride] = useState<T | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fnRef
      .current()
      .then((data) => {
        if (!cancelled) {
          setOverride(null);
          setResult({ key: reqKey, data, error: null });
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          const s = getSession();
          clearSession();
          router.replace(loginPathFor(s?.role ?? "student"));
          return;
        }
        setResult((r) => ({ key: reqKey, data: r.data, error: e instanceof Error ? e.message : "Something went wrong." }));
      });
    return () => {
      cancelled = true;
    };
  }, [reqKey, enabled, router]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const loading = enabled && result.key !== reqKey;

  return { data: override ?? result.data, error: loading ? null : result.error, loading, reload, setData: setOverride };
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}
