"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ProfileBadge } from "@/components/crucible/profile-badge";
import { StatusBadge } from "@/components/crucible/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { SimulationRunRow } from "@/lib/crucible/types";

export function LibraryView() {
  const [runs, setRuns] = useState<SimulationRunRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [profile, setProfile] = useState<string>("all");
  const [sort, setSort] = useState<"created" | "conflict" | "goal">("created");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/crucible/runs");
      if (!res.ok) return;
      const j = (await res.json()) as { runs: SimulationRunRow[] };
      setRuns(j.runs ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...runs];
    if (q.trim()) list = list.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));
    if (status !== "all") list = list.filter((r) => r.status === status);
    if (profile !== "all") list = list.filter((r) => r.simulation_profile === profile);
    if (sort === "created") list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "conflict")
      list.sort(
        (a, b) => Number(b.overall_conflict_score ?? 0) - Number(a.overall_conflict_score ?? 0)
      );
    if (sort === "goal")
      list.sort(
        (a, b) => Number(b.goal_completion_score ?? 0) - Number(a.goal_completion_score ?? 0)
      );
    return list;
  }, [runs, q, status, profile, sort]);

  const profiles = useMemo(() => {
    const s = new Set(runs.map((r) => r.simulation_profile));
    return ["all", ...s];
  }, [runs]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Simulation Library</h1>
        <p className="text-sm text-muted-foreground">Browse and filter historical runs.</p>
      </header>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Search title</label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="border-white/10 bg-black/30" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
            <SelectTrigger className="w-full border-white/10 bg-black/30 md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Profile</label>
          <Select value={profile} onValueChange={(v) => setProfile(v ?? "all")}>
            <SelectTrigger className="w-full border-white/10 bg-black/30 md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sort</label>
          <Select value={sort} onValueChange={(v) => setSort((v ?? "created") as typeof sort)}>
            <SelectTrigger className="w-full border-white/10 bg-black/30 md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Created (newest)</SelectItem>
              <SelectItem value="conflict">Conflict score</SelectItem>
              <SelectItem value="goal">Goal score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
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
            {filtered.map((r) => (
              <TableRow key={r.id} className="border-white/10">
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>
                  <ProfileBadge name={r.simulation_profile} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="font-mono text-xs">{pct(r.overall_conflict_score)}</TableCell>
                <TableCell className="font-mono text-xs">{pct(r.goal_completion_score)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="space-x-2">
                  {r.status === "completed" ? (
                    <Link
                      href={`/report?id=${r.id}`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "ghost" }),
                        "h-8 px-2 text-indigo-400"
                      )}
                    >
                      Report
                    </Link>
                  ) : null}
                  <Link
                    href={`/builder?title=${encodeURIComponent(r.title)}&target_url=${encodeURIComponent(r.target_url)}&goal=${encodeURIComponent(r.goal ?? "")}&profile=${encodeURIComponent(r.simulation_profile)}`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "ghost" }),
                      "h-8 px-2 text-indigo-400"
                    )}
                  >
                    Rerun
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${(Number(v) * 100).toFixed(0)}%`;
}
