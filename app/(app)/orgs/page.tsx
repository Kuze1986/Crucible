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

  const orgs = (data ?? []).map((row) => ({
    ...(row.organizations as Record<string, unknown>),
    role: row.role as string,
  }));

  return <OrgList initialOrgs={orgs as Parameters<typeof OrgList>[0]["initialOrgs"]} />;
}
