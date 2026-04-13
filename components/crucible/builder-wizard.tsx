"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { WeightBars } from "@/components/crucible/weight-bars";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_ENGINE_WEIGHTS, SYSTEM_PROFILE_NAMES } from "@/lib/crucible/constants";
import { ENGINE_WEIGHT_KEYS, type EngineWeights } from "@/lib/crucible/types";

import { ChevronLeft, ChevronRight, FlaskConical } from "lucide-react";

type ProfileCard = {
  name: string;
  description: string | null;
  engine_weights: EngineWeights;
  is_system_profile: boolean;
};

export function BuilderWizard() {
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState(0);
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [customWeights, setCustomWeights] = useState<EngineWeights>({ ...DEFAULT_ENGINE_WEIGHTS });
  const [persona, setPersona] = useState("");
  const [blocked, setBlocked] = useState("");
  const [forbidden, setForbidden] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = sp.get("title");
    const u = sp.get("target_url");
    const g = sp.get("goal");
    const p = sp.get("profile");
    if (t) setTitle(t);
    if (u) setTargetUrl(u);
    if (g) setGoal(g);
    if (p) setSelectedProfile(p);
  }, [sp]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/crucible/profiles");
        if (!res.ok) return;
        const j = (await res.json()) as { profiles?: ProfileCard[] };
        setProfiles(j.profiles ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const systemCards = useMemo(() => {
    const fromApi = profiles.filter((p) => p.is_system_profile);
    if (fromApi.length) return fromApi;
    return SYSTEM_PROFILE_NAMES.map((name) => ({
      name,
      description: "",
      engine_weights: { ...DEFAULT_ENGINE_WEIGHTS },
      is_system_profile: true,
    }));
  }, [profiles]);

  const selectedWeights = useMemo(() => {
    if (selectedProfile === "custom") return customWeights;
    const found = systemCards.find((p) => p.name === selectedProfile);
    return found?.engine_weights ?? {};
  }, [selectedProfile, systemCards, customWeights]);

  const steps = ["Target", "Profile", "Persona", "Review"];

  const urlOk = (() => {
    try {
      if (!targetUrl.trim()) return false;
      new URL(targetUrl);
      return true;
    } catch {
      return false;
    }
  })();

  const canNext =
    step === 0
      ? title.trim() && urlOk
      : step === 1
        ? !!selectedProfile
        : step === 2
          ? true
          : true;

  async function launch() {
    setErr(null);
    setLoading(true);
    try {
      const engine_weights =
        selectedProfile === "custom"
          ? customWeights
          : (systemCards.find((p) => p.name === selectedProfile)?.engine_weights ?? customWeights);
      const persona_context = persona.trim() ? { description: persona.trim() } : null;
      const constraints =
        blocked.trim() || forbidden.trim()
          ? {
              blocked_actions: blocked
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              forbidden_zones: forbidden
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : null;

      const res = await fetch("/api/crucible/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          target_url: targetUrl.trim(),
          simulation_profile: selectedProfile === "custom" ? "custom" : selectedProfile!,
          engine_weights,
          goal: goal.trim() || null,
          persona_context,
          constraints,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : JSON.stringify(j.error ?? j));
        return;
      }
      const id = j.run?.id as string | undefined;
      if (id) router.push(`/monitor?id=${id}`);
      else setErr("No run id returned");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Simulation Builder</h1>
        <p className="text-sm text-muted-foreground">Target → Profile → Persona → Review</p>
      </div>
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded border px-2 py-1 text-center text-xs font-mono ${
              i === step
                ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-200"
                : "border-white/10 text-muted-foreground"
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="border-white/10 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Target</CardTitle>
            <CardDescription>What site are we exercising?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-white/10 bg-black/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">Target URL</Label>
              <Input
                id="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://"
                className="border-white/10 bg-black/30"
              />
              {!urlOk && targetUrl ? (
                <p className="text-xs text-red-400">Enter a valid URL including protocol.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Goal (optional)</Label>
              <Textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What should the simulated user be trying to accomplish?"
                className="border-white/10 bg-black/30"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {systemCards.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setSelectedProfile(p.name);
                setCustomWeights({ ...DEFAULT_ENGINE_WEIGHTS, ...p.engine_weights });
              }}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selectedProfile === p.name
                  ? "border-indigo-500/60 bg-indigo-500/10"
                  : "border-white/10 bg-[#0f1117] hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-indigo-400" />
                <span className="font-medium">{p.name}</span>
              </div>
              {p.description ? (
                <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>
              ) : null}
              <div className="mt-3 text-[10px] text-muted-foreground">
                <WeightBars weights={p.engine_weights} />
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedProfile("custom")}
            className={`rounded-lg border p-4 text-left ${
              selectedProfile === "custom"
                ? "border-indigo-500/60 bg-indigo-500/10"
                : "border-white/10 bg-[#0f1117] hover:border-white/20"
            }`}
          >
            <span className="font-medium">Custom</span>
            <p className="mt-2 text-xs text-muted-foreground">Tune all eight engine dimensions manually.</p>
          </button>
          {selectedProfile === "custom" ? (
            <Card className="border-white/10 bg-[#0f1117] sm:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">Engine weights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ENGINE_WEIGHT_KEYS.map((key) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                      <span>{key}</span>
                      <span>{(customWeights[key] ?? 0).toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[customWeights[key] ?? 0]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(v) => {
                        const n = Array.isArray(v) ? (v[0] ?? 0) : v;
                        setCustomWeights((prev) => ({ ...prev, [key]: n }));
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {step === 2 && (
        <Card className="border-white/10 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Persona (optional)</CardTitle>
            <CardDescription>Constrain behavior without changing the engine profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Persona description</Label>
              <Textarea
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="border-white/10 bg-black/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Blocked actions (comma-separated)</Label>
              <Textarea
                value={blocked}
                onChange={(e) => setBlocked(e.target.value)}
                className="border-white/10 bg-black/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Forbidden zones — URL patterns (comma-separated)</Label>
              <Textarea
                value={forbidden}
                onChange={(e) => setForbidden(e.target.value)}
                className="border-white/10 bg-black/30"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-white/10 bg-[#0f1117]">
          <CardHeader>
            <CardTitle>Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Title:</span> {title}
            </div>
            <div>
              <span className="text-muted-foreground">URL:</span>{" "}
              <span className="break-all text-indigo-300">{targetUrl}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Profile:</span> {selectedProfile}
            </div>
            {goal ? (
              <div>
                <span className="text-muted-foreground">Goal:</span> {goal}
              </div>
            ) : null}
            <div className="rounded border border-white/10 p-3">
              <WeightBars weights={selectedWeights} />
            </div>
            {err ? <p className="text-sm text-red-400">{err}</p> : null}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          className="border-white/10"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="mr-1 size-4" />
          Back
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-500"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
            <ChevronRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            className="bg-indigo-600 hover:bg-indigo-500"
            disabled={loading || !canNext}
            onClick={() => void launch()}
          >
            {loading ? "Launching…" : "Launch Simulation"}
          </Button>
        )}
      </div>
    </div>
  );
}
