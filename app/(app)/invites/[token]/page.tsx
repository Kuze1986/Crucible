import { redirect } from "next/navigation";

import { AcceptInvite } from "@/components/crucible/accept-invite";
import { createServerSupabaseClient, createServiceSupabaseCrucible } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;

  const svc = createServiceSupabaseCrucible();
  const { data: invite } = await svc
    .from("org_invites")
    .select("id,email,role,org_id,accepted_at,expires_at,organizations(name,slug)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">This invite link is invalid or has expired.</p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invites/${token}`);
  }

  const inv = invite as typeof invite & {
    accepted_at: string | null;
    expires_at: string;
    organizations: { name: string; slug: string } | null;
  };

  if (inv.accepted_at || new Date(inv.expires_at) < new Date()) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">This invite has already been used or has expired.</p>
      </div>
    );
  }

  return (
    <AcceptInvite
      token={token}
      orgName={inv.organizations?.name ?? "an organization"}
      role={inv.email}
      inviteEmail={inv.email}
      currentUserEmail={user.email ?? ""}
    />
  );
}
