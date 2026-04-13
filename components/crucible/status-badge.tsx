import { cn } from "@/lib/utils";

import type { RunStatus } from "@/lib/crucible/types";

export function StatusBadge({ status }: { status: RunStatus | string }) {
  const s = status as RunStatus;
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium font-mono uppercase tracking-wide";

  if (s === "queued") {
    return (
      <span className={cn(base, "border-white/15 bg-white/5 text-muted-foreground")}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
        queued
      </span>
    );
  }
  if (s === "running") {
    return (
      <span className={cn(base, "border-blue-500/40 bg-blue-500/10 text-blue-300")}>
        <span className="inline-block size-2 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        running
      </span>
    );
  }
  if (s === "completed") {
    return (
      <span className={cn(base, "border-emerald-500/40 bg-emerald-500/10 text-emerald-300")}>
        completed
      </span>
    );
  }
  return (
    <span className={cn(base, "border-red-500/40 bg-red-500/10 text-red-300")}>failed</span>
  );
}
