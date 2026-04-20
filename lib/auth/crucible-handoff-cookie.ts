import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Short-lived cookie set from /login before navigating to Nexus so /auth/callback can restore external redirect_to. */
export const CRUCIBLE_HANDOFF_COOKIE = "crucible_redirect_to";

export function parseExternalHandoffTarget(raw: string | undefined, siteUrl: string): URL | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  let target: URL;
  try {
    target = new URL(decoded);
  } catch {
    return null;
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") return null;
  const selfOrigin = new URL(siteUrl).origin;
  if (target.origin === selfOrigin) return null;
  return target;
}

/** Copy Set-Cookie entries from one NextResponse onto another (e.g. Supabase session + handoff clear). */
export function copyResponseCookies(from: NextResponse, to: NextResponse): void {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value ?? "", {
      path: c.path,
      domain: c.domain,
      maxAge: c.maxAge,
      expires: c.expires,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite as "lax" | "strict" | "none" | undefined,
    });
  }
}

/**
 * If a handoff cookie points to another origin, redirect there with tokens and session cookies.
 * Otherwise returns `sourceResponse` unchanged.
 */
export async function applyExternalHandoffIfPresent(
  siteUrl: string,
  cookieStore: { get: (name: string) => { value: string } | undefined },
  supabase: SupabaseClient,
  sourceResponse: NextResponse
): Promise<NextResponse> {
  const raw = cookieStore.get(CRUCIBLE_HANDOFF_COOKIE)?.value;
  const target = parseExternalHandoffTarget(raw, siteUrl);
  if (!target) return sourceResponse;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token || !session.refresh_token) return sourceResponse;

  target.searchParams.set("access_token", session.access_token);
  target.searchParams.set("refresh_token", session.refresh_token);

  const out = NextResponse.redirect(target.toString());
  copyResponseCookies(sourceResponse, out);
  out.cookies.set(CRUCIBLE_HANDOFF_COOKIE, "", { path: "/", maxAge: 0 });
  return out;
}
