"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { assignWindowLocationFromRedirectToSession } from "@/lib/auth/client-redirect-to";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function isPublicLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/login/";
}

type AuthContextValue = {
  accessHydrated: boolean;
};

const AuthContext = createContext<AuthContextValue>({ accessHydrated: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessHydrated, setAccessHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined") return;

      const path = window.location.pathname;
      const supabase = createBrowserSupabaseClient();

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && isPublicLoginPath(path)) {
          assignWindowLocationFromRedirectToSession(session as Session);
          return;
        }

        if (isPublicLoginPath(path)) return;

        const rawRpc = process.env.NEXT_PUBLIC_AUTH_ACCESS_RPC;
        const rpc =
          rawRpc === undefined || rawRpc === null ? "get_my_access" : rawRpc.trim();
        if (rpc === "") return;

        const { error } = await supabase.rpc(rpc, {});
        if (error && process.env.NODE_ENV === "development") {
          console.warn("[AuthProvider]", rpc, error.message);
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AuthProvider] hydrate", e);
        }
      } finally {
        if (!cancelled) setAccessHydrated(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ accessHydrated }), [accessHydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
