import type { Role, Session } from "./types";

const KEY = "sp_session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — session lives only for this page */
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}

export function loginPathFor(role: Role) {
  return role === "student" ? "/login" : `/${role}/login`;
}
