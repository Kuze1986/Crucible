import Link from "next/link";

import { DashboardCharts } from "@/components/crucible/dashboard-charts";
import { EmptyState } from "@/components/crucible/empty-state";
import { ProfileBadge } from "@/components/crucible/profile-badge";
import { StatusBadge } from "@/components/crucible/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import type { SimulationRunRow } from "@/lib/crucible/types";

import { FlaskConical } from "lucide-react";

function num(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return (Number(n) * 100).toFixed(0) + "%";
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: runs, error } = await supabase
    .from("simulation_runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    const msg = typeof error.message === "string" ? error.message : "";
    const lower = msg.toLowerCase();
    let hint = "";
    if (lower.includes("invalid schema")) {
      hint =
        " In Supabase, expose this schema under Settings → Data API → Exposed schemas, or set NEXT_PUBLIC_SUPABASE_SCHEMA (e.g. public) to match where your Crucible tables live.";
    } else if (lower.includes("permission denied for schema")) {
      hint =
        " Run the SQL in supabase/migrations/20260419120000_crucible_api_grants.sql (GRANT USAGE + table privileges for anon/authenticated) in the Supabase SQL editor, then retry.";
    }
    return (
      <p className="text-red-400">
        Failed to load runs: {error.message}
        {hint}
      </p>
    );
  }

  const list = (runs ?? []) as SimulationRunRow[];
  const completed = list.filter((r) => r.status === "completed");
  const hasCompleted = completed.length > 0;
  const avgConflict =
    completed.length && completed.some((r) => r.overall_conflict_score != null)
      ? completed.reduce((a, r) => a + (Number(r.overall_conflict_score) || 0), 0) /
        completed.filter((r) => r.overall_conflict_score != null).length
      : null;
  const avgGoal =
    completed.length && completed.some((r) => r.goal_completion_score != null)
      ? completed.reduce((a, r) => a + (Number(r.goal_completion_score) || 0), 0) /
        completed.filter((r) => r.goal_completion_score != null).length
      : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-white">Command Center</h1>
          <p className="text-sm text-muted-foreground">Behavioral intelligence overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/builder"
            className={cn(buttonVariants(), "bg-indigo-600 text-white hover:bg-indigo-500")}
          >
            New Simulation
          </Link>
          {hasCompleted ? (
            <Link
              href="/library"
              className={cn(buttonVariants({ variant: "outline" }), "border-white/10")}
            >
              Library
            </Link>
          ) : null}
        </div>
      </header>

      {list.length === 0 ? (
        <div className="space-y-5">
          <EmptyState
            icon={FlaskConical}
            title="Run your first simulation"
            description="Run your first simulation — paste a URL or upload content to begin."
            actionLabel="Start First Run"
            actionHref="/builder"
          />
          <section className="rounded-lg border border-white/10 bg-[#0f1117] p-4">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Guided first run flow
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-white/85">
              <li>1. Choose what you are testing: URL, text, or pitch deck.</li>
              <li>2. Pick a system profile (preselected) and keep defaults.</li>
              <li>3. Launch the gauntlet and review the first results.</li>
            </ol>
          </section>
        </div>
      ) : (
        <>
          {completed.length === 1 ? (
            <section className="rounded-lg border border-cyan-300/30 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-300">First result unlocked</p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Here&apos;s what your 6-persona gauntlet found.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Conflict Score reveal:{" "}
                <span className="font-mono text-white">{num(completed[0]?.overall_conflict_score)}</span>
              </p>
              <Link
                className="mt-3 inline-flex text-sm text-indigo-300 hover:text-indigo-200"
                href={`/report?id=${completed[0]?.id}`}
              >
                View your first gauntlet report →
              </Link>
            </section>
          ) : null}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total runs" value={String(list.length)} />
            <Stat label="Completed" value={String(completed.length)} />
            <Stat label="Avg conflict" value={avgConflict != null ? num(avgConflict) : "—"} />
            <Stat label="Avg goal completion" value={avgGoal != null ? num(avgGoal) : "—"} />
          </section>
          <DashboardCharts runs={list} />
          <section>
            <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">
              Recent runs
            </h2>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>Title</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="font-mono">Conflict</TableHead>
                    <TableHead className="font-mono">Goal</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.slice(0, 12).map((r) => (
                    <TableRow key={r.id} className="border-white/10">
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>
                        <ProfileBadge name={r.simulation_profile} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{num(r.overall_conflict_score)}</TableCell>
                      <TableCell className="font-mono text-xs">{num(r.goal_completion_score)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {r.status === "completed" ? (
                          <Link className="text-xs text-indigo-400 hover:underline" href={`/report?id=${r.id}`}>
                            View report
                          </Link>
                        ) : (
                          <Link className="text-xs text-indigo-400 hover:underline" href={`/monitor?id=${r.id}`}>
                            Monitor
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f1117] px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-xl tabular-nums text-white">{value}</div>
    </div>
  );
}
