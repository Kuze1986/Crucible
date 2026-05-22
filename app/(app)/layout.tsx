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

  const [{ data: firstCompleted }, { count: unreadCount }, { data: orgMemberships }] = await Promise.all([
    supabase
      .from("simulation_runs")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
    supabase
      .from("org_members")
      .select("organizations(id,name,slug)")
      .eq("user_id", user.id),
  ]);

  type OrgShape = { id: string; name: string; slug: string };
  const orgs = (orgMemberships ?? [])
    .map((m) => (m.organizations as unknown) as OrgShape | null)
    .filter((o): o is OrgShape => o !== null && typeof o === "object" && "id" in o);

  return (
    <AppChrome
      user={user}
      hasCompletedRun={Boolean(firstCompleted?.id)}
      unreadCount={unreadCount ?? 0}
      orgs={orgs}
    >
      {children}
    </AppChrome>
  );
}
