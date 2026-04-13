import { ENGINE_WEIGHT_KEYS } from "@/lib/crucible/types";

import type { EngineWeights } from "@/lib/crucible/types";

export function WeightBars({ weights }: { weights: EngineWeights | null | undefined }) {
  const w = weights ?? {};
  return (
    <div className="flex flex-col gap-1.5">
      {ENGINE_WEIGHT_KEYS.map((key) => {
        const val = typeof w[key] === "number" ? w[key]! : 0;
        return (
          <div key={key} className="flex items-center gap-2 text-[10px] font-mono uppercase text-muted-foreground">
            <span className="w-28 shrink-0 truncate">{key.replace("_", " ")}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/5">
              <div
                className="h-full rounded bg-indigo-500/80"
                style={{ width: `${Math.min(1, Math.max(0, val)) * 100}%` }}
              />
            </div>
            <span className="w-8 tabular-nums text-foreground">{val.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}
