"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type ShareRun = {
  id: string;
  title: string;
  completed_at: string | null;
  overall_conflict_score: number | null;
  goal_completion_score: number | null;
  experience_score: number | null;
  trust_trajectory: string | null;
  session_summary: { recommendation?: string } | null;
};

type ShareStep = {
  id: string;
  step_number: number;
  action: string;
  conflict_score: number | null;
  trust_delta: number | null;
  behavioral_reasoning: string | null;
  conflict_type: string | null;
  created_at: string;
};

export function ShareResultView({
  run,
  steps,
  embed = false,
}: {
  run: ShareRun;
  steps: ShareStep[];
  embed?: boolean;
}) {
  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.step_number - b.step_number || a.created_at.localeCompare(b.created_at)),
    [steps]
  );

  const personaRows = useMemo(() => {
    const map = new Map<
      string,
      { trustSum: number; trustN: number; conflictSum: number; conflictN: number; stepCount: number }
    >();
    const runningTrustByPersona = new Map<string, number>();
    for (const step of sortedSteps) {
      const persona = step.conflict_type?.trim() || "Scenario";
      const cur = map.get(persona) ?? { trustSum: 0, trustN: 0, conflictSum: 0, conflictN: 0, stepCount: 0 };
      const prevTrust = runningTrustByPersona.get(persona) ?? 50;
      const trustScore = clamp(prevTrust + Number(step.trust_delta ?? 0) * 100, 0, 100);
      runningTrustByPersona.set(persona, trustScore);
      cur.trustSum += trustScore;
      cur.trustN += 1;
      if (step.conflict_score != null) {
        cur.conflictSum += Number(step.conflict_score) * 100;
        cur.conflictN += 1;
      }
      cur.stepCount += 1;
      map.set(persona, cur);
    }
    return [...map.entries()]
      .map(([persona, v]) => ({
        persona,
        trustScore: v.trustN ? v.trustSum / v.trustN : 0,
        conflictScore: v.conflictN ? v.conflictSum / v.conflictN : 0,
        stepCount: v.stepCount,
      }))
      .sort((a, b) => a.trustScore - b.trustScore);
  }, [sortedSteps]);

  const timeline = useMemo(() => {
    const runningTrustByPersona = new Map<string, number>();
    return sortedSteps.map((step) => {
      const persona = step.conflict_type?.trim() || "Scenario";
      const prev = runningTrustByPersona.get(persona) ?? 50;
      const trust = clamp(prev + Number(step.trust_delta ?? 0) * 100, 0, 100);
      runningTrustByPersona.set(persona, trust);
      return {
        step: step.step_number,
        persona,
        action: step.action,
        trust,
      };
    });
  }, [sortedSteps]);

  const timelineRows = useMemo(() => {
    const grouped = new Map<number, Record<string, number | string>>();
    for (const point of timeline) {
      const row = grouped.get(point.step) ?? { step: point.step };
      row[point.persona] = point.trust;
      grouped.set(point.step, row);
    }
    return [...grouped.values()].sort((a, b) => Number(a.step) - Number(b.step));
  }, [timeline]);

  const personas = useMemo(() => [...new Set(timeline.map((p) => p.persona))], [timeline]);
  const lowest = useMemo(() => timeline.reduce((min, p) => (!min || p.trust < min.trust ? p : min), null as null | (typeof timeline)[number]), [timeline]);

  const compositeScore = useMemo(() => {
    const values = [
      run.goal_completion_score != null ? Number(run.goal_completion_score) * 100 : null,
      run.experience_score != null ? Number(run.experience_score) * 100 : null,
      run.overall_conflict_score != null ? 100 - Number(run.overall_conflict_score) * 100 : null,
    ].filter((v): v is number => v != null);
    if (!values.length) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }, [run.experience_score, run.goal_completion_score, run.overall_conflict_score]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 text-foreground">
      {!embed ? (
        <header className="space-y-2 border-b border-white/10 pb-4">
          <p className="font-mono text-xl font-semibold tracking-wide">Crucible</p>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Gauntlet Results</p>
          <h1 className="text-xl font-semibold">{run.title || run.id}</h1>
          <p className="text-xs text-muted-foreground">
            {run.completed_at ? `Completed ${new Date(run.completed_at).toLocaleString()}` : "Completion time unavailable"}
          </p>
          <p className="text-xs text-muted-foreground">Powered by NEXUS · Crucible</p>
        </header>
      ) : null}

      <section className="rounded-lg border border-white/10 bg-[#0f1117] p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Composite Trust Score</p>
        <p className={`mt-2 text-5xl font-bold ${scoreColor(compositeScore)}`}>{compositeScore}</p>
        {run.session_summary?.recommendation ? (
          <p className="mt-3 text-sm text-muted-foreground">{run.session_summary.recommendation}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0f1117] p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Persona Score Breakdown</h2>
        <div className="space-y-4">
          {personaRows.map((row) => (
            <div key={row.persona} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{row.persona}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  trust {row.trustScore.toFixed(0)} · conflict {row.conflictScore.toFixed(0)} · steps {row.stepCount}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className={`h-2 rounded-full ${scoreBarColor(row.trustScore)}`}
                  style={{ width: `${Math.max(0, Math.min(100, row.trustScore))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0f1117] p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Trust Delta Timeline</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={timelineRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
              <XAxis dataKey="step" stroke="rgba(255,255,255,0.6)" />
              <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.6)" />
              <Tooltip />
              <Legend />
              {personas.map((persona, idx) => (
                <Line
                  key={persona}
                  type="monotone"
                  dataKey={persona}
                  stroke={palette[idx % palette.length]}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {lowest ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Lowest step: {lowest.persona} on step {lowest.step} ({lowest.action}) with trust {lowest.trust.toFixed(0)}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0f1117] p-5">
        <details open={!embed}>
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Storyboard Steps
          </summary>
          <div className="mt-3 space-y-2">
            {sortedSteps.map((step) => (
              <div key={step.id} className="rounded border border-white/10 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs">Step {step.step_number}</span>
                  <span className="text-xs text-muted-foreground">{step.conflict_type?.trim() || "Scenario"}</span>
                </div>
                <p className="mt-1">{step.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  trust {clamp(50 + Number(step.trust_delta ?? 0) * 100, 0, 100).toFixed(0)} · conflict{" "}
                  {step.conflict_score != null ? (Number(step.conflict_score) * 100).toFixed(0) : "—"}
                </p>
                {step.behavioral_reasoning ? (
                  <p className="mt-1 text-xs text-muted-foreground">{step.behavioral_reasoning}</p>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      </section>

      {!embed ? (
        <footer className="border-t border-white/10 pt-4 text-sm text-muted-foreground">
          <p>
            <Link className="text-indigo-300 hover:text-indigo-200" href="/">
              Run this gauntlet on your own content →
            </Link>
          </p>
          <p className="mt-1">Crucible + NEXUS</p>
        </footer>
      ) : null}
    </div>
  );
}

const palette = ["#60a5fa", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#22d3ee"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreBarColor(score: number) {
  if (score >= 70) return "bg-emerald-400";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-400";
}
