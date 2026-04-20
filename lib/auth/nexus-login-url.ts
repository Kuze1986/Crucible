import { sanitizeNextPath } from "@/lib/auth/site-url";

/** Query keys that often carry “where to go after login” — stale values in NEXT_PUBLIC_NEXUS_LOGIN_URL can strand users on Nexus. */
const STALE_RETURN_PARAM_KEYS = [
  "redirect_to",
  "redirect_uri",
  "return_url",
  "returnUrl",
  "callback_url",
  "callbackUrl",
];

/**
 * Builds the Nexus login URL with optional hints so the IdP can return the user
 * to Supabase PKCE exchange on this app.
 *
 * Env:
 * - NEXT_PUBLIC_APP_URL — canonical site URL (falls back to request headers via resolvePublicAppUrl)
 * - NEXT_PUBLIC_NEXUS_REDIRECT_PARAM — primary query key (default: redirect_to)
 * - NEXT_PUBLIC_NEXUS_NEXT_PARAM — deep-link after auth (default: next)
 * - NEXT_PUBLIC_NEXUS_MIRROR_REDIRECT_URI — also set redirect_uri to the same callback (default: 1).
 *   Set to 0 if Nexus rejects duplicate OAuth-style params.
 * - NEXT_PUBLIC_NEXUS_CLEAR_STALE_RETURN_PARAMS — remove stale return_* keys from the base URL (default: 1).
 *
 * @param appBaseOverride — e.g. from resolvePublicAppUrl() when env is unset (Railway).
 */
export function buildNexusLoginUrl(nextPath?: string | null, appBaseOverride?: string | null): string {
  const base = process.env.NEXT_PUBLIC_NEXUS_LOGIN_URL?.trim();
  if (!base) return "/login";

  const appUrl = (appBaseOverride ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const u = new URL(base);

  if (appUrl) {
    const clearStale = (process.env.NEXT_PUBLIC_NEXUS_CLEAR_STALE_RETURN_PARAMS ?? "1") !== "0";
    if (clearStale) {
      for (const k of STALE_RETURN_PARAM_KEYS) {
        u.searchParams.delete(k);
      }
    }

    const callback = `${appUrl}/auth/callback`;
    const primary = process.env.NEXT_PUBLIC_NEXUS_REDIRECT_PARAM?.trim() || "redirect_to";
    u.searchParams.set(primary, callback);

    const mirror = (process.env.NEXT_PUBLIC_NEXUS_MIRROR_REDIRECT_URI ?? "1") !== "0";
    if (mirror && primary !== "redirect_uri") {
      u.searchParams.set("redirect_uri", callback);
    }
  }

  if (nextPath != null && String(nextPath).trim() !== "") {
    const next = sanitizeNextPath(nextPath, "/dashboard");
    const nextKey = process.env.NEXT_PUBLIC_NEXUS_NEXT_PARAM?.trim() || "next";
    u.searchParams.set(nextKey, next);
  }

  return u.toString();
}
