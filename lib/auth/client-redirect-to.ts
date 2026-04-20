import type { Session } from "@supabase/supabase-js";

/**
 * Matches post–signInWithPassword behaviour: if `redirect_to` is present, navigate there;
 * for another origin, append Supabase tokens so the target app can call setSession.
 * @returns false if `redirect_to` is present but not a valid encoded URL (caller may show an error).
 */
export function assignWindowLocationFromRedirectToSession(session: Session): boolean {
  if (typeof window === "undefined") return true;

  const redirectTo = new URLSearchParams(window.location.search).get("redirect_to");
  if (redirectTo) {
    let raw: string;
    try {
      raw = decodeURIComponent(redirectTo);
    } catch {
      return false;
    }
    const target = new URL(raw, window.location.origin);
    if (target.origin !== window.location.origin) {
      target.searchParams.set("access_token", session.access_token);
      target.searchParams.set("refresh_token", session.refresh_token);
    }
    window.location.assign(target.toString());
  } else {
    window.location.assign("/");
  }
  return true;
}
