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
    return <p className="text-red-400">Failed to load runs: {error.message}</p>;
  }

  const list = (runs ?? []) as SimulationRunRow[];
  const completed = list.filter((r) => r.status === "completed");
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
          <Link
            href="/library"
            className={cn(buttonVariants({ variant: "outline" }), "border-white/10")}
          >
            Library
          </Link>
        </div>
      </header>

      {list.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No simulations yet"
          description="Launch your first behavioral simulation against a target URL."
          actionLabel="New Simulation"
          actionHref="/builder"
        />
      ) : (
        <>
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
