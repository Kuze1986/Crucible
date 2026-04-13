"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function SettingsForm({ email }: { email: string }) {
  const [orchUrl, setOrchUrl] = useState("");
  const [orchKey, setOrchKey] = useState("");
  const [demoforgeUrl, setDemoforgeUrl] = useState("");
  const [demoforgeOn, setDemoforgeOn] = useState(false);
  const [notify, setNotify] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/crucible/settings");
      if (!res.ok) return;
      const j = (await res.json()) as {
        settings: {
          orchestrator_url?: string | null;
          orchestrator_api_key?: string | null;
          demoforge_base_url?: string | null;
          demoforge_export_enabled?: boolean;
          notify_email_on_complete?: boolean;
          display_name?: string | null;
        } | null;
      };
      const s = j.settings;
      if (!s) return;
      setOrchUrl(s.orchestrator_url ?? "");
      setDemoforgeUrl(s.demoforge_base_url ?? "");
      setDemoforgeOn(!!s.demoforge_export_enabled);
      setNotify(!!s.notify_email_on_complete);
      setDisplayName(s.display_name ?? "");
    })();
  }, []);

  async function save() {
    setMsg(null);
    const payload: Record<string, unknown> = {
      orchestrator_url: orchUrl.trim() ? orchUrl.trim() : null,
      demoforge_base_url: demoforgeUrl.trim() ? demoforgeUrl.trim() : null,
      demoforge_export_enabled: demoforgeOn,
      notify_email_on_complete: notify,
      display_name: displayName.trim() ? displayName.trim() : null,
    };
    if (orchKey.trim()) payload.orchestrator_api_key = orchKey.trim();

    const res = await fetch("/api/crucible/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) setMsg("Save failed");
    else setMsg("Saved.");
    setOrchKey("");
  }

  async function testConnection() {
    setTestOk(null);
    const res = await fetch("/api/crucible/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orchestrator_url: orchUrl, orchestrator_api_key: orchKey }),
    });
    const j = (await res.json()) as { ok?: boolean };
    setTestOk(!!j.ok);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Orchestrator, integrations, and account.</p>
      </div>
      {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}

      <Card className="border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>API configuration</CardTitle>
          <CardDescription>Overrides default Railway / env orchestrator when set.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Orchestrator URL</Label>
            <Input
              value={orchUrl}
              onChange={(e) => setOrchUrl(e.target.value)}
              placeholder="https://orchestrator.example.com"
              className="border-white/10 bg-black/30"
            />
          </div>
          <div className="space-y-1">
            <Label>API key</Label>
            <Input
              type="password"
              value={orchKey}
              onChange={(e) => setOrchKey(e.target.value)}
              placeholder="Leave blank to keep stored key"
              className="border-white/10 bg-black/30"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="border-white/10" onClick={() => void testConnection()}>
              Test connection
            </Button>
            {testOk === true ? <span className="text-xs text-emerald-400">Reachable</span> : null}
            {testOk === false ? <span className="text-xs text-red-400">Failed</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>DemoForge integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>DemoForge base URL</Label>
            <Input
              value={demoforgeUrl}
              onChange={(e) => setDemoforgeUrl(e.target.value)}
              className="border-white/10 bg-black/30"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={demoforgeOn} onChange={(e) => setDemoforgeOn(e.target.checked)} />
            Enable export toggle in UI
          </label>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Email on simulation complete
          </label>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-[#0f1117]">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Display name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="border-white/10 bg-black/30"
            />
          </div>
          <Separator className="bg-white/10" />
          <div className="text-sm text-muted-foreground">
            Email <span className="font-mono text-foreground">{email}</span> (from Supabase Auth, read-only)
          </div>
        </CardContent>
      </Card>

      <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => void save()}>
        Save settings
      </Button>
    </div>
  );
}
