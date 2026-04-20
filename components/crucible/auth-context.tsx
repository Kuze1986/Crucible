"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { assignWindowLocationFromRedirectToSession } from "@/lib/auth/client-redirect-to";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function isPublicLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/login/";
}

function redirectIfLoginSession(session: Session | null): void {
  if (!session) return;
  const rt = new URLSearchParams(window.location.search).get("redirect_to");
  if (rt) {
    assignWindowLocationFromRedirectToSession(session as Session);
  } else {
    window.location.replace("/dashboard");
  }
}

type AuthContextValue = {
  accessHydrated: boolean;
};

const AuthContext = createContext<AuthContextValue>({ accessHydrated: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessHydrated, setAccessHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      if (typeof window === "undefined") return;

      const path = window.location.pathname;
      const supabase = createBrowserSupabaseClient();

      try {
        if (isPublicLoginPath(path)) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!cancelled) redirectIfLoginSession(session);

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!isPublicLoginPath(window.location.pathname)) return;
            redirectIfLoginSession(session);
          });
          unsubscribe = () => subscription.unsubscribe();
        } else {
          const rawRpc = process.env.NEXT_PUBLIC_AUTH_ACCESS_RPC;
          const rpc = typeof rawRpc === "string" ? rawRpc.trim() : "";
          if (rpc.length > 0) {
            const { error } = await supabase.rpc(rpc, {});
            if (error && process.env.NODE_ENV === "development") {
              console.warn("[AuthProvider]", rpc, error.message);
            }
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AuthProvider] hydrate", e);
        }
      } finally {
        if (!cancelled) setAccessHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo(() => ({ accessHydrated }), [accessHydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
