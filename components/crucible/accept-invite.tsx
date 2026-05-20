"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AcceptInvite({
  token,
  orgName,
  role,
  inviteEmail,
  currentUserEmail,
}: {
  token: string;
  orgName: string;
  role: string;
  inviteEmail: string;
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailMismatch = inviteEmail.toLowerCase() !== currentUserEmail.toLowerCase();

  async function accept() {
    setErr(null);
    setAccepting(true);
    const res = await fetch(`/api/crucible/invites/${token}`, { method: "POST" });
    setAccepting(false);
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setErr(j.error ?? "Failed to accept invite");
      return;
    }
    const j = (await res.json()) as { org_id?: string };
    router.push(j.org_id ? `/orgs/${j.org_id}` : "/orgs");
  }

  return (
    <div className="mx-auto max-w-md py-20">
      <Card className="border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>Join {orgName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have been invited to join <span className="text-foreground font-medium">{orgName}</span> as{" "}
            <span className="text-foreground">{role}</span>.
          </p>
          {emailMismatch && (
            <p className="text-sm text-amber-400">
              This invite was sent to <span className="font-mono">{inviteEmail}</span> but you are signed in as{" "}
              <span className="font-mono">{currentUserEmail}</span>. Sign in with the correct account to accept.
            </p>
          )}
          {err && <p className="text-sm text-red-400">{err}</p>}
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500"
            disabled={accepting || emailMismatch}
            onClick={() => void accept()}
          >
            {accepting ? "Accepting…" : "Accept invitation"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
