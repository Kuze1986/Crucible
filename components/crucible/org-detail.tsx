"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Member = { user_id: string; role: string; joined_at: string };
type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
};
type Org = { id: string; name: string; slug: string; owner_id: string };

export function OrgDetail({
  org,
  members: initialMembers,
  invites: initialInvites,
  currentUserId,
  myRole,
}: {
  org: Org;
  members: Member[];
  invites: Invite[];
  currentUserId: string;
  myRole: "owner" | "admin" | "member";
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canManage = myRole === "owner" || myRole === "admin";

  async function sendInvite() {
    setErr(null);
    setMsg(null);
    setInviting(true);
    const res = await fetch(`/api/crucible/orgs/${org.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    setInviting(false);
    if (!res.ok) {
      const j = (await res.json()) as { error: unknown };
      setErr(typeof j.error === "string" ? j.error : "Failed to send invite");
      return;
    }
    const j = (await res.json()) as { invite: Invite };
    setInvites((prev) => [j.invite, ...prev]);
    setMsg(`Invite sent to ${inviteEmail.trim()}`);
    setInviteEmail("");
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/crucible/orgs/${org.id}/members/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    if (userId === currentUserId) {
      router.push("/orgs");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }

  async function changeRole(userId: string, role: "admin" | "member") {
    const res = await fetch(`/api/crucible/orgs/${org.id}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) return;
    setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role } : m)));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{org.name}</h1>
        <p className="text-sm text-muted-foreground">/{org.slug} · your role: {myRole}</p>
      </div>

      <Card className="border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
              <div>
                <span className="font-mono text-xs">{m.user_id.slice(0, 12)}…</span>
                <span className="ml-2 text-xs text-muted-foreground">{m.role}</span>
              </div>
              {canManage && m.role !== "owner" && (
                <div className="flex gap-1">
                  {m.role === "member" && (
                    <Button size="sm" variant="outline" className="h-6 border-white/10 px-2 text-xs"
                      onClick={() => void changeRole(m.user_id, "admin")}>
                      Make admin
                    </Button>
                  )}
                  {m.role === "admin" && (
                    <Button size="sm" variant="outline" className="h-6 border-white/10 px-2 text-xs"
                      onClick={() => void changeRole(m.user_id, "member")}>
                      Make member
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-6 border-red-500/30 px-2 text-xs text-red-400 hover:border-red-500/60"
                    onClick={() => void removeMember(m.user_id)}>
                    Remove
                  </Button>
                </div>
              )}
              {!canManage && m.user_id === currentUserId && (
                <Button size="sm" variant="outline" className="h-6 border-white/10 px-2 text-xs"
                  onClick={() => void removeMember(m.user_id)}>
                  Leave
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage && (
        <Card className="border-white/10 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Invite member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {err && <p className="text-sm text-red-400">{err}</p>}
            {msg && <p className="text-sm text-emerald-400">{msg}</p>}
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="border-white/10 bg-black/30"
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                  className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-500"
              disabled={inviting || !inviteEmail.trim()}
              onClick={() => void sendInvite()}
            >
              {inviting ? "Sending…" : "Send invite"}
            </Button>

            {invites.length > 0 && (
              <>
                <Separator className="bg-white/10" />
                <p className="text-xs font-medium text-muted-foreground">Pending invites</p>
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs">
                    <span>{inv.email}</span>
                    <span className="text-muted-foreground">{inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
