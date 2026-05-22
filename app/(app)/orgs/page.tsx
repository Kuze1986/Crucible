import { redirect } from "next/navigation";

import { OrgList } from "@/components/crucible/org-list";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrgsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("org_members")
    .select("role, organizations(*)")
    .eq("user_id", user.id);

  type OrgShape = { id: string; name: string; slug: string; owner_id: string; created_at: string };
  const orgs = (data ?? [])
    .map((row) => {
      const org = (row.organizations as unknown) as OrgShape | null;
      if (!org || typeof org !== "object" || !("id" in org)) return null;
      return { ...org, role: row.role as string };
    })
    .filter((o): o is OrgShape & { role: string } => o !== null);

  return <OrgList initialOrgs={orgs} />;
}
