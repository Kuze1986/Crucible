import { ArrowDownRight, ArrowRight, ArrowUpRight, Shuffle } from "lucide-react";

import { cn } from "@/lib/utils";

import type { TrustTrajectory } from "@/lib/crucible/types";

export function TrustBadge({ value }: { value: TrustTrajectory | string | null | undefined }) {
  const v = (value ?? "stable") as TrustTrajectory;
  const map = {
    rising: { icon: ArrowUpRight, className: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
    falling: { icon: ArrowDownRight, className: "text-red-400 border-red-500/40 bg-red-500/10" },
    stable: { icon: ArrowRight, className: "text-muted-foreground border-white/10 bg-white/5" },
    volatile: { icon: Shuffle, className: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  } as const;
  const m = map[v] ?? map.stable;
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-mono capitalize",
        m.className
      )}
    >
      <Icon className="size-3" />
      {v}
    </span>
  );
}
