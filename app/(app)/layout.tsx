import { redirect } from "next/navigation";

import { AppChrome } from "@/components/crucible/app-chrome";
import { buildNexusLoginUrl } from "@/lib/auth/nexus-login-url";
import { resolvePublicAppUrl } from "@/lib/auth/public-origin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const appBase = await resolvePublicAppUrl();
    const nexusHref = buildNexusLoginUrl(undefined, appBase || undefined);
    if (nexusHref !== "/login") redirect(nexusHref);
    redirect("/login");
  }

  return <AppChrome user={user}>{children}</AppChrome>;
}
