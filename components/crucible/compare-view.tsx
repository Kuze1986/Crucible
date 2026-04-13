"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ProfileBadge } from "@/components/crucible/profile-badge";
import { StatusBadge } from "@/components/crucible/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { SimulationRunRow, StoryboardStepRow } from "@/lib/crucible/types";

type Loaded = { run: SimulationRunRow; steps: StoryboardStepRow[] };

export function CompareView() {
  const sp = useSearchParams();
  const initial = useMemo(() => {
    const raw = sp.get("ids") ?? "";
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }, [sp]);

  const [ids, setIds] = useState<string[]>(initial);
  const [addId, setAddId] = useState("");
  const [runs, setRuns] = useState<Loaded[]>([]);

  useEffect(() => {
    setIds(initial);
  }, [initial]);

  useEffect(() => {
    void (async () => {
      const out: Loaded[] = [];
      for (const id of ids) {
        const res = await fetch(`/api/crucible/runs/${id}`);
        if (!res.ok) continue;
        const j = (await res.json()) as Loaded;
        out.push(j);
      }
      setRuns(out);
    })();
  }, [ids]);

  const heatmap = useMemo(() => {
    const map = new Map<string, { sum: number; n: number }>();
    for (const r of runs) {
      for (const s of r.steps) {
        if (!s.url) continue;
        const cur = map.get(s.url) ?? { sum: 0, n: 0 };
        cur.sum += Number(s.conflict_score ?? 0);
        cur.n += 1;
        map.set(s.url, cur);
      }
    }
    return [...map.entries()]
      .map(([url, v]) => ({ url, avg: v.n ? v.sum / v.n : 0, steps: v.n }))
      .sort((a, b) => b.avg - a.avg);
  }, [runs]);

  const maxSteps = Math.max(0, ...runs.map((r) => r.steps.length));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Comparison</h1>
        <p className="text-sm text-muted-foreground">Up to four runs side by side.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <Button
            key={id}
            size="sm"
            variant="outline"
            className="border-white/10 font-mono text-xs"
            onClick={() => setIds((prev) => prev.filter((x) => x !== id))}
          >
            Remove {id.slice(0, 8)}…
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          value={addId}
          onChange={(e) => setAddId(e.target.value)}
          placeholder="Run UUID"
          className="max-w-md border-white/10 bg-black/30"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={ids.length >= 4 || !addId.trim()}
          onClick={() => {
            const v = addId.trim();
            if (!v || ids.includes(v)) return;
            setIds((prev) => [...prev, v].slice(0, 4));
            setAddId("");
          }}
        >
          Add run
        </Button>
        <Link
          href={`/compare?ids=${ids.join(",")}`}
          className={cn(buttonVariants({ variant: "outline" }), "border-white/10")}
        >
          Share URL
        </Link>
      </div>

      <section>
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Score comparison
        </h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>Metric</TableHead>
                {runs.map((r) => (
                  <TableHead key={r.run.id} className="min-w-[120px] font-mono text-xs">
                    {r.run.title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <MetricRow label="Status" runs={runs} render={(r) => <StatusBadge status={r.run.status} />} />
              <MetricRow label="Profile" runs={runs} render={(r) => <ProfileBadge name={r.run.simulation_profile} />} />
              <MetricRow
                label="Conflict"
                runs={runs}
                render={(r) => (
                  <span className="font-mono text-xs">{pct(r.run.overall_conflict_score)}</span>
                )}
              />
              <MetricRow
                label="Goal"
                runs={runs}
                render={(r) => (
                  <span className="font-mono text-xs">{pct(r.run.goal_completion_score)}</span>
                )}
              />
              <MetricRow
                label="Experience"
                runs={runs}
                render={(r) => (
                  <span className="font-mono text-xs">{pct(r.run.experience_score)}</span>
                )}
              />
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Merged conflict heatmap
        </h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead>URL</TableHead>
                <TableHead className="font-mono">Avg conflict</TableHead>
                <TableHead className="font-mono">Steps</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heatmap.map((row) => (
                <TableRow key={row.url} className="border-white/10">
                  <TableCell className="max-w-lg truncate text-xs" title={row.url}>
                    {row.url}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.avg.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-xs">{row.steps}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Storyboard diff
        </h2>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {runs.map((r) => (
            <div key={r.run.id} className="rounded border border-white/10 bg-[#0f1117] p-2">
              <div className="mb-2 text-xs font-medium">{r.run.title}</div>
              <div className="max-h-96 space-y-1 overflow-auto text-[10px]">
                {Array.from({ length: maxSteps }).map((_, i) => {
                  const s = r.steps[i];
                  return (
                    <div key={i} className="rounded bg-black/30 px-1 py-0.5 font-mono text-muted-foreground">
                      {s ? `${s.step_number} ${s.action}` : "—"}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricRow({
  label,
  runs,
  render,
}: {
  label: string;
  runs: Loaded[];
  render: (r: Loaded) => ReactNode;
}) {
  return (
    <TableRow className="border-white/10">
      <TableCell className="font-medium">{label}</TableCell>
      {runs.map((r) => (
        <TableCell key={r.run.id}>{render(r)}</TableCell>
      ))}
    </TableRow>
  );
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${(Number(v) * 100).toFixed(0)}%`;
}
