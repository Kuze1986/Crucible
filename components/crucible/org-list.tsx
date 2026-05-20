"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrgWithRole = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  role: string;
};

export function OrgList({ initialOrgs }: { initialOrgs: OrgWithRole[] }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(initialOrgs);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    setCreating(true);
    const res = await fetch("/api/crucible/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
    });
    setCreating(false);
    if (!res.ok) {
      const j = (await res.json()) as { error: unknown };
      setErr(typeof j.error === "string" ? j.error : "Failed to create");
      return;
    }
    const j = (await res.json()) as { org: OrgWithRole };
    setOrgs((prev) => [...prev, { ...j.org, role: "owner" }]);
    setName("");
    setSlug("");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Teams</h1>
        <p className="text-sm text-muted-foreground">Collaborate on simulations with your team.</p>
      </div>

      {orgs.length > 0 ? (
        <div className="space-y-2">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/orgs/${org.id}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0f1117] px-4 py-3 hover:bg-white/[0.03]"
            >
              <div>
                <p className="font-medium">{org.name}</p>
                <p className="text-xs text-muted-foreground">/{org.slug} · {org.role}</p>
              </div>
              <span className="text-xs text-indigo-400">Open →</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You are not a member of any teams yet.</p>
      )}

      <Card className="border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>Create a team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {err && <p className="text-sm text-red-400">{err}</p>}
          <div className="space-y-1">
            <Label>Team name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              className="border-white/10 bg-black/30"
            />
          </div>
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="acme-corp"
              className="border-white/10 bg-black/30"
            />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
          </div>
          <Button
            className="bg-indigo-600 hover:bg-indigo-500"
            disabled={creating || !name.trim() || !slug.trim()}
            onClick={() => void create()}
          >
            {creating ? "Creating…" : "Create team"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
