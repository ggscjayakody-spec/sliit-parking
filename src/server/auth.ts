import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import type { Role } from "@/lib/types";
import { HttpError } from "./http";

/**
 * Secret for login tokens and slip links. Set AUTH_SECRET in Vercel to choose your own;
 * otherwise one is derived from the (already secret) database URL.
 */
function secretBytes() {
  const s = process.env.AUTH_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!s) throw new HttpError(503, "The server isn't configured yet (no AUTH_SECRET or database).");
  return createHash("sha256").update(`sliit-parking:${s}`).digest();
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function signToken(role: Role, userId: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretBytes());
}

/** Reads the Bearer token and checks the role. Returns the user's ID. */
export async function requireRole(req: Request, role: Role): Promise<string> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Please log in.");
  let payload;
  try {
    ({ payload } = await jwtVerify(token, secretBytes(), { algorithms: ["HS256"] }));
  } catch {
    throw new HttpError(401, "Your session has expired. Please log in again.");
  }
  if (payload.role !== role || !payload.sub) throw new HttpError(403, "You don't have access to this.");
  return payload.sub;
}

/* ── Signed links for payment slips, so <img src> works without a login header ── */

const SLIP_LINK_SECONDS = 60 * 60;

function slipSig(id: string, exp: number) {
  return createHmac("sha256", secretBytes()).update(`slip:${id}:${exp}`).digest("base64url");
}

export function slipUrl(slipId: string | null): string | null {
  if (!slipId) return null;
  const exp = Math.floor(Date.now() / 1000) + SLIP_LINK_SECONDS;
  return `/api/slips/${slipId}?exp=${exp}&sig=${slipSig(slipId, exp)}`;
}

export function checkSlipLink(id: string, exp: string | null, sig: string | null) {
  const e = Number(exp);
  if (!sig || !Number.isFinite(e) || e < Date.now() / 1000) return false;
  const want = Buffer.from(slipSig(id, e));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
