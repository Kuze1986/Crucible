"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProfileBadge } from "@/components/crucible/profile-badge";
import { StatusBadge } from "@/components/crucible/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { ACTIVE_ORG_KEY } from "@/components/crucible/org-switcher";

const PAGE_SIZE = 25;

export function LibraryView() {
  // Results
  const [runs, setRuns] = useState<SimulationRunRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("all");
  const [profile, setProfile] = useState("all");
  const [sort, setSort] = useState<"created" | "conflict" | "goal">("created");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [conflictMin, setConflictMin] = useState("");
  const [conflictMax, setConflictMax] = useState("");

  // Active org from switcher
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  useEffect(() => {
    setActiveOrgId(localStorage.getItem(ACTIVE_ORG_KEY));
  }, []);

  // Per-row cancel state
  const [cancellingIds, setCancellingIds] = useState<ReadonlySet<string>>(new Set());

  // Profile dropdown options
  const [profileOptions, setProfileOptions] = useState<string[]>([]);

  // Debounce title search; reset to page 1 when it fires
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // Load available profiles once for the dropdown
  useEffect(() => {
    void fetch("/api/crucible/profiles")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { profiles?: Array<{ name: string }> } | null) => {
        if (j?.profiles) setProfileOptions(j.profiles.map((p) => p.name));
      });
  }, []);

  // Fetch page whenever any filter or page changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));
    params.set("sort", sort);
    if (debouncedQ) params.set("q", debouncedQ);
    if (status !== "all") params.set("status", status);
    if (profile !== "all") params.set("profile", profile);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (conflictMin !== "") params.set("score_conflict_min", String(Number(conflictMin) / 100));
    if (conflictMax !== "") params.set("score_conflict_max", String(Number(conflictMax) / 100));
    if (activeOrgId) params.set("org_id", activeOrgId);

    setLoading(true);
    void fetch(`/api/crucible/runs?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { runs: SimulationRunRow[]; total: number } | null) => {
        if (!j) return;
        setRuns(j.runs ?? []);
        setTotal(j.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, sort, debouncedQ, status, profile, dateFrom, dateTo, conflictMin, conflictMax, activeOrgId]);

  // Filter change helpers — reset to page 1 immediately
  function handleStatus(v: string | null) { setStatus(v ?? "all"); setPage(1); }
  function handleProfile(v: string | null) { setProfile(v ?? "all"); setPage(1); }
  function handleSort(v: string | null) { setSort((v ?? "created") as typeof sort); setPage(1); }
  function handleDateFrom(v: string | null) { setDateFrom(v ?? ""); setPage(1); }
  function handleDateTo(v: string | null) { setDateTo(v ?? ""); setPage(1); }
  function handleConflictMin(v: string | null) { setConflictMin(v ?? ""); setPage(1); }
  function handleConflictMax(v: string | null) { setConflictMax(v ?? ""); setPage(1); }

  async function cancelRun(id: string) {
    setCancellingIds((prev) => new Set([...prev, id]));
    try {
      const res = await fetch(`/api/crucible/runs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed" }),
      });
      if (res.ok) {
        setRuns((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "failed" as const } : r))
        );
      }
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    params.set("format", "csv");
    params.set("sort", sort);
    if (debouncedQ) params.set("q", debouncedQ);
    if (status !== "all") params.set("status", status);
    if (profile !== "all") params.set("profile", profile);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (conflictMin !== "") params.set("score_conflict_min", String(Number(conflictMin) / 100));
    if (conflictMax !== "") params.set("score_conflict_max", String(Number(conflictMax) / 100));
    if (activeOrgId) params.set("org_id", activeOrgId);
    window.location.href = `/api/crucible/runs?${params.toString()}`;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight">Simulation Library</h1>
          <p className="text-sm text-muted-foreground">Browse and filter historical runs.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="shrink-0 border-white/10">
          Export CSV
        </Button>
      </header>

      {/* Primary filters */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-muted-foreground">Search title</label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-white/10 bg-black/30"
            placeholder="Filter by title…"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={status} onValueChange={handleStatus}>
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
          <Select value={profile} onValueChange={handleProfile}>
            <SelectTrigger className="w-full border-white/10 bg-black/30 md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All profiles</SelectItem>
              {profileOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sort</label>
          <Select value={sort} onValueChange={handleSort}>
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

      {/* Advanced filters */}
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Created from</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateFrom(e.target.value)}
            className="w-40 border-white/10 bg-black/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Created to</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateTo(e.target.value)}
            className="w-40 border-white/10 bg-black/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Conflict min %</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={conflictMin}
            onChange={(e) => handleConflictMin(e.target.value)}
            placeholder="0"
            className="w-28 border-white/10 bg-black/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Conflict max %</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={conflictMax}
            onChange={(e) => handleConflictMax(e.target.value)}
            placeholder="100"
            className="w-28 border-white/10 bg-black/30"
          />
        </div>
      </div>

      {/* Table */}
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
            {loading && runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No runs match your filters.
                </TableCell>
              </TableRow>
            ) : (
              runs.map((r) => (
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
                  <TableCell className="flex items-center gap-1">
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
                    {r.status === "queued" || r.status === "running" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-red-400 hover:text-red-300"
                        disabled={cancellingIds.has(r.id)}
                        onClick={() => void cancelRun(r.id)}
                      >
                        {cancellingIds.has(r.id) ? "Cancelling…" : "Cancel"}
                      </Button>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {total} {total === 1 ? "run" : "runs"} total
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

function pct(v: number | null | undefined) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `${(Number(v) * 100).toFixed(0)}%`;
}
