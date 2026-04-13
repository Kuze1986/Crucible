import { cn } from "@/lib/utils";

import type { StoryboardStepRow } from "@/lib/crucible/types";

import { Badge } from "@/components/ui/badge";

function SignalBar({ label, value }: { label: string; value: number | null | undefined }) {
  const v = typeof value === "number" ? Math.min(1, Math.max(0, value)) : 0;
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-16 text-muted-foreground">{label}</span>
      <div className="h-1 flex-1 rounded bg-white/5">
        <div className="h-full rounded bg-indigo-500/70" style={{ width: `${v * 100}%` }} />
      </div>
      <span className="w-8 font-mono tabular-nums">{value != null ? value.toFixed(2) : "—"}</span>
    </div>
  );
}

export function StoryboardStepRowView({
  step,
  dense,
}: {
  step: StoryboardStepRow;
  dense?: boolean;
}) {
  const conflict = step.conflict_score ?? 0;
  const exp = step.experience_score ?? null;
  const highConflict = conflict >= 0.65;
  const lowExp = exp != null && exp < 0.4;
  return (
    <div
      className={cn(
        "rounded-md border border-white/10 bg-[#0f1117] p-3",
        highConflict && "border-l-4 border-l-red-500",
        !highConflict && lowExp && "border-l-4 border-l-amber-500"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">#{step.step_number}</span>
        <Badge variant="outline" className="border-white/15 font-mono text-[10px] uppercase">
          {step.action}
        </Badge>
        {step.status === "failed" ? (
          <Badge variant="destructive" className="text-[10px]">
            failed
          </Badge>
        ) : null}
        {step.url ? (
          <span className="truncate text-xs text-indigo-300/90" title={step.url ?? ""}>
            {step.url}
          </span>
        ) : null}
      </div>
      {step.behavioral_reasoning && !dense ? (
        <p className="mt-2 text-sm text-muted-foreground">{step.behavioral_reasoning}</p>
      ) : null}
      {!dense ? (
        <div className="mt-3 grid gap-1 sm:grid-cols-2">
          <SignalBar label="Intent" value={step.intent_alignment} />
          <SignalBar label="Conflict" value={step.conflict_score} />
          <SignalBar label="Emotional" value={step.emotional_signal} />
          <SignalBar label="Trust Δ" value={step.trust_delta != null ? (step.trust_delta + 1) / 2 : null} />
          <SignalBar label="Experience" value={step.experience_score} />
        </div>
      ) : null}
    </div>
  );
}
