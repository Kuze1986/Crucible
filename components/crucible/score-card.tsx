import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ScoreCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "bad"
          ? "text-red-400"
          : "text-foreground";
  return (
    <Card className="border-white/10 bg-[#0f1117]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("font-mono text-2xl tabular-nums", toneCls)}>{value}</div>
      </CardContent>
    </Card>
  );
}
