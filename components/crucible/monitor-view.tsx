"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ArcGauge } from "@/components/crucible/arc-gauge";
import { ProfileBadge } from "@/components/crucible/profile-badge";
import { StatusBadge } from "@/components/crucible/status-badge";
import { StoryboardStepRowView } from "@/components/crucible/storyboard-step-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { SimulationRunRow, StoryboardStepRow } from "@/lib/crucible/types";

export function MonitorView() {
  const sp = useSearchParams();
  const id = sp.get("id");
  const [run, setRun] = useState<SimulationRunRow | null>(null);
  const [steps, setSteps] = useState<StoryboardStepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      await fetch(`/api/crucible/runs/${id}/sync`, { method: "POST" });
      const res = await fetch(`/api/crucible/runs/${id}`);
      if (!res.ok) {
        setErr("Failed to load run");
        return;
      }
      const j = (await res.json()) as { run: SimulationRunRow; steps: StoryboardStepRow[] };
      setRun(j.run);
      setSteps(j.steps ?? []);
      setErr(null);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pollStatus = run?.status;
  useEffect(() => {
    if (!id || !pollStatus) return;
    if (pollStatus !== "queued" && pollStatus !== "running") return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [id, pollStatus, load]);

  async function cancel() {
    if (!id) return;
    await fetch(`/api/crucible/runs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "failed" }),
    });
    void load();
  }

  if (!id) return <p className="text-sm text-muted-foreground">Missing run id.</p>;
  if (loading && !run) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (err || !run) return <p className="text-sm text-red-400">{err ?? "Not found"}</p>;

  const conflictStep = steps.find((s) => (s.conflict_score ?? 0) >= 0.65);
  const latest = steps.length ? steps[steps.length - 1] : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{run.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={run.status} />
            <ProfileBadge name={run.simulation_profile} />
            <span className="truncate text-xs text-indigo-300/90" title={run.target_url}>
              {run.target_url}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(run.status === "queued" || run.status === "running") && (
            <Button variant="destructive" size="sm" onClick={() => void cancel()}>
              Cancel
            </Button>
          )}
          {run.status === "completed" ? (
            <Link
              href={`/report?id=${run.id}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-indigo-600 text-white hover:bg-indigo-500"
              )}
            >
              View Full Report
            </Link>
          ) : null}
        </div>
      </header>

      {conflictStep ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          High conflict at step {conflictStep.step_number}
          {conflictStep.conflict_type ? ` (${conflictStep.conflict_type})` : ""}.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        <section className="space-y-3 rounded-lg border border-white/10 bg-[#0f1117] p-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Progress</h2>
          <p className="font-mono text-sm text-white">
            Steps recorded: <span className="text-indigo-300">{steps.length}</span>
          </p>
          {latest ? (
            <p className="text-sm text-muted-foreground">
              Latest:{" "}
              <span className="font-mono text-foreground">
                {latest.action} {latest.url ? `· ${latest.url}` : ""}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for storyboard steps…</p>
          )}
          <div className="space-y-2">
            {steps.map((s) => (
              <div key={s.id} className="transition-opacity duration-300">
                <StoryboardStepRowView step={s} dense />
              </div>
            ))}
          </div>
        </section>
        <div className="flex flex-col items-center justify-start rounded-lg border border-white/10 bg-[#0f1117] p-4">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Conflict
          </h2>
          <ArcGauge value={Number(run.overall_conflict_score ?? 0)} label="overall" />
        </div>
      </div>
    </div>
  );
}
