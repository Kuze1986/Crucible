import { notFound, redirect } from "next/navigation";

import { OrgDetail } from "@/components/crucible/org-detail";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ orgId: string }> };

export default async function OrgDetailPage({ params }: Props) {
  const { orgId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: orgRow }, { data: membersRaw }, { data: invitesRaw }] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle(),
    supabase
      .from("org_members")
      .select("user_id, role, joined_at")
      .eq("org_id", orgId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("org_invites")
      .select("id, email, role, token, created_at, accepted_at, expires_at")
      .eq("org_id", orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (!orgRow) notFound();

  const myMembership = (membersRaw ?? []).find((m) => m.user_id === user.id);
  if (!myMembership) notFound();

  return (
    <OrgDetail
      org={orgRow as Parameters<typeof OrgDetail>[0]["org"]}
      members={(membersRaw ?? []) as Parameters<typeof OrgDetail>[0]["members"]}
      invites={(invitesRaw ?? []) as Parameters<typeof OrgDetail>[0]["invites"]}
      currentUserId={user.id}
      myRole={myMembership.role as "owner" | "admin" | "member"}
    />
  );
}
