"use client";

import { CRUCIBLE_HANDOFF_COOKIE } from "@/lib/auth/crucible-handoff-cookie";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Persists `?redirect_to=` (external return URL) in a short-lived cookie before leaving for Nexus,
 * so `/auth/callback` can hand off tokens after Supabase establishes the Crucible session.
 */
export function NexusSignInLink({ href, className, children }: Props) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        const rt = new URLSearchParams(window.location.search).get("redirect_to");
        if (!rt) return;
        const maxAge = 10 * 60;
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `${CRUCIBLE_HANDOFF_COOKIE}=${encodeURIComponent(rt)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
      }}
    >
      {children}
    </a>
  );
}
