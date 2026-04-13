import { cn } from "@/lib/utils";

import { isSystemProfileName } from "@/lib/crucible/constants";

const styles: Record<string, string> = {
  "Buyer Journey": "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  "Skeptical Evaluator": "border-amber-500/40 bg-amber-500/10 text-amber-200",
  "Anxious First Timer": "border-purple-500/40 bg-purple-500/10 text-purple-200",
  "Conflict Stress Test": "border-red-500/40 bg-red-500/10 text-red-300",
  "Power User": "border-blue-500/40 bg-blue-500/10 text-blue-200",
  custom: "border-indigo-500/40 bg-indigo-500/10 text-indigo-200",
};

export function ProfileBadge({ name }: { name: string }) {
  const key = name === "custom" || !isSystemProfileName(name) ? "custom" : name;
  const cls = styles[key] ?? styles.custom;
  return (
    <span
      className={cn(
        "inline-flex max-w-[200px] truncate rounded border px-2 py-0.5 text-xs font-medium",
        cls
      )}
      title={name}
    >
      {name}
    </span>
  );
}
