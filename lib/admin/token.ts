import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "crucible_admin";

function getSecret() {
  return process.env.ADMIN_PASSWORD ?? "";
}

/** Signed payload: base64url(json).base64url(hmac) */
export function createAdminSessionToken(): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp, v: 1 }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return false;
    }
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number; v?: number };
    return typeof parsed.exp === "number" && Date.now() < parsed.exp;
  } catch {
    return false;
  }
}

export const adminCookieName = COOKIE_NAME;

export function adminSessionCookieOptions() {
  const maxAge = 7 * 24 * 60 * 60;
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
