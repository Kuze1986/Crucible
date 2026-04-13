"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProfileBadge } from "@/components/crucible/profile-badge";
import { ScoreCard } from "@/components/crucible/score-card";
import { StatusBadge } from "@/components/crucible/status-badge";
import { StoryboardStepRowView } from "@/components/crucible/storyboard-step-row";
import { TrustBadge } from "@/components/crucible/trust-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  SimulationRunRow,
  StoryboardStepRow,
  UxFailurePoint,
  UxFailurePointsDoc,
} from "@/lib/crucible/types";

import { Activity, Download, Flag, Target } from "lucide-react";

export function ReportView() {
  const sp = useSearchParams();
  const id = sp.get("id");
  const [run, setRun] = useState<SimulationRunRow | null>(null);
  const [steps, setSteps] = useState<StoryboardStepRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/crucible/runs/${id}`);
    if (!res.ok) return;
    const j = (await res.json()) as { run: SimulationRunRow; steps: StoryboardStepRow[] };
    setRun(j.run);
    setSteps(j.steps ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const heatmap = useMemo(() => {
    const map = new Map<string, { sum: number; n: number; visits: Set<string> }>();
    for (const s of steps) {
      if (!s.url) continue;
      const cur = map.get(s.url) ?? { sum: 0, n: 0, visits: new Set<string>() };
      cur.sum += Number(s.conflict_score ?? 0);
      cur.n += 1;
      cur.visits.add(s.url);
      map.set(s.url, cur);
    }
    return [...map.entries()]
      .map(([url, v]) => ({
        url,
        avg: v.n ? v.sum / v.n : 0,
        visits: 1,
        steps: v.n,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [steps]);

  const uxPoints: UxFailurePoint[] =
    ((run?.ux_failure_points as UxFailurePointsDoc | null)?.points as UxFailurePoint[]) ?? [];

  async function exportDemoForge() {
    if (!id) return;
    await fetch(`/api/crucible/runs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exported_to_demoforge: true }),
    });
    void load();
    alert("Marked as exported to DemoForge.");
  }

  if (!id) return <p className="text-sm text-muted-foreground">Missing run id.</p>;
  if (loading || !run) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const summary = run.session_summary;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{run.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <ProfileBadge name={run.simulation_profile} />
            <StatusBadge status={run.status} />
            {run.completed_at ? <span>Completed {new Date(run.completed_at).toLocaleString()}</span> : null}
            {run.duration_seconds != null ? (
              <span className="font-mono">Duration {Number(run.duration_seconds).toFixed(0)}s</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="border-white/10" onClick={() => void exportDemoForge()}>
            Export to DemoForge
          </Button>
          <Link
            href={`/compare?ids=${run.id}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "border-white/10")}
          >
            Compare
          </Link>
          <Link
            href={`/builder?title=${encodeURIComponent(run.title)}&target_url=${encodeURIComponent(run.target_url)}&goal=${encodeURIComponent(run.goal ?? "")}&profile=${encodeURIComponent(run.simulation_profile)}`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-indigo-600 text-white hover:bg-indigo-500"
            )}
          >
            Rerun
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard
          label="Conflict score"
          value={pct(run.overall_conflict_score)}
          icon={Activity}
          tone={toneConflict(run.overall_conflict_score)}
        />
        <ScoreCard
          label="Goal completion"
          value={pct(run.goal_completion_score)}
          icon={Target}
          tone={toneGood(run.goal_completion_score)}
        />
        <ScoreCard
          label="Experience"
          value={pct(run.experience_score)}
          icon={Flag}
          tone={toneGood(run.experience_score)}
        />
        <CardTrust value={run.trust_trajectory} />
      </section>

      {run.artifact_video_url ? (
        <section className="rounded-lg border border-white/10 bg-[#0f1117] p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Session recording
          </h2>
          <video className="max-h-[420px] w-full rounded bg-black" controls src={run.artifact_video_url} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Storyboard</h2>
        <div className="space-y-2">
          {steps.map((s) => (
            <StoryboardStepRowView key={s.id} step={s} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Conflict heatmap
        </h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>URL</TableHead>
                <TableHead className="font-mono">Avg conflict</TableHead>
                <TableHead className="font-mono">Visits</TableHead>
                <TableHead className="font-mono">Steps</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heatmap.map((row) => (
                <TableRow key={row.url} className="border-white/10">
                  <TableCell className="max-w-md truncate text-xs" title={row.url}>
                    {row.url}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.avg.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs">{row.visits}</TableCell>
                  <TableCell className="font-mono text-xs">{row.steps}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">UX failure points</h2>
        <div className="space-y-2">
          {uxPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          ) : (
            uxPoints.map((p, i) => (
              <div key={i} className="rounded border border-white/10 bg-[#0f1117] p-3 text-sm">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="font-mono text-muted-foreground">Step {p.step}</span>
                  <span className="rounded border border-amber-500/40 px-1.5 py-0.5 text-amber-200">
                    {p.type}
                  </span>
                  <span className="font-mono">score {p.score}</span>
                </div>
                {p.url ? <p className="mt-1 truncate text-xs text-indigo-300">{p.url}</p> : null}
                {p.reasoning ? <p className="mt-2 text-muted-foreground">{p.reasoning}</p> : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0f1117] p-4">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Session summary</h2>
        {summary?.recommendation ? (
          <p className="text-sm text-foreground">{summary.recommendation}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No recommendation text.</p>
        )}
        {summary?.trust_trajectory_detail ? (
          <p className="mt-2 text-sm text-muted-foreground">{summary.trust_trajectory_detail}</p>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">Key strengths</div>
            <ul className="mt-1 list-inside list-disc text-sm text-emerald-400">
              {(summary?.key_strengths ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Key weaknesses</div>
            <ul className="mt-1 list-inside list-disc text-sm text-red-400">
              {(summary?.key_weaknesses ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Artifacts</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ArtifactLink label="Video" href={run.artifact_video_url} />
          <ArtifactLink label="Storyboard" href={run.artifact_storyboard_url} />
          <ArtifactLink label="Transcript" href={run.artifact_transcript_url} />
          <ArtifactLink label="Full package" href={run.artifact_package_url} />
        </div>
      </section>
    </div>
  );
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${(Number(v) * 100).toFixed(0)}%`;
}

function toneConflict(v: number | null | undefined): "good" | "warn" | "bad" | "neutral" {
  const n = Number(v);
  if (Number.isNaN(n)) return "neutral";
  if (n < 0.35) return "good";
  if (n < 0.65) return "warn";
  return "bad";
}

function toneGood(v: number | null | undefined): "good" | "warn" | "bad" | "neutral" {
  const n = Number(v);
  if (Number.isNaN(n)) return "neutral";
  if (n >= 0.65) return "good";
  if (n >= 0.4) return "warn";
  return "bad";
}

function CardTrust({ value }: { value: string | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f1117] p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Trust trajectory</span>
      </div>
      <div className="mt-2">
        <TrustBadge value={value} />
      </div>
    </div>
  );
}

function ArtifactLink({ label, href }: { label: string; href: string | null }) {
  const disabled = !href;
  return disabled ? (
    <div className="flex items-center gap-2 rounded border border-white/5 bg-black/20 px-3 py-2 text-sm text-muted-foreground line-through opacity-50">
      <Download className="size-4" />
      {label}
    </div>
  ) : (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded border border-white/10 bg-[#0f1117] px-3 py-2 text-sm text-indigo-300 hover:bg-white/5"
    >
      <Download className="size-4" />
      {label}
    </a>
  );
}
