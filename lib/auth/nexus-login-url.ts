import { sanitizeNextPath } from "@/lib/auth/site-url";

/**
 * Builds the Nexus login URL with optional hints so the IdP can return the user
 * to Supabase PKCE exchange on this app.
 *
 * Env:
 * - NEXT_PUBLIC_APP_URL — canonical site URL (required for redirect hints in production)
 * - NEXT_PUBLIC_NEXUS_REDIRECT_PARAM — query key for the post-login browser URL (default: redirect_uri)
 * - NEXT_PUBLIC_NEXUS_NEXT_PARAM — query key for deep-link after auth (default: next)
 */
export function buildNexusLoginUrl(nextPath?: string | null): string {
  const base = process.env.NEXT_PUBLIC_NEXUS_LOGIN_URL?.trim();
  if (!base) return "/login";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const u = new URL(base);

  if (appUrl) {
    const redirectKey = process.env.NEXT_PUBLIC_NEXUS_REDIRECT_PARAM?.trim() || "redirect_uri";
    if (!u.searchParams.get(redirectKey)) {
      u.searchParams.set(redirectKey, `${appUrl}/auth/callback`);
    }
  }

  if (nextPath != null && String(nextPath).trim() !== "") {
    const next = sanitizeNextPath(nextPath, "/dashboard");
    const nextKey = process.env.NEXT_PUBLIC_NEXUS_NEXT_PARAM?.trim() || "next";
    if (!u.searchParams.get(nextKey)) {
      u.searchParams.set(nextKey, next);
    }
  }

  return u.toString();
}
