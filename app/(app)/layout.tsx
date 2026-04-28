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
    redirect("/login");
  }

  const { data: firstCompleted } = await supabase
    .from("simulation_runs")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  return <AppChrome user={user} hasCompletedRun={Boolean(firstCompleted?.id)}>{children}</AppChrome>;
}
