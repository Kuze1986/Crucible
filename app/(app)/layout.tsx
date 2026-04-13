import { redirect } from "next/navigation";

import { AppChrome } from "@/components/crucible/app-chrome";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const ext = process.env.NEXT_PUBLIC_NEXUS_LOGIN_URL;
    if (ext) redirect(ext);
    redirect("/login");
  }

  return <AppChrome user={user}>{children}</AppChrome>;
}
