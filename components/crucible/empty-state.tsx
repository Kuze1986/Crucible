import type { LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-[#0f1117]/60 py-16 text-center">
      <Icon className="size-10 text-muted-foreground" />
      <h3 className="font-mono text-sm font-semibold tracking-tight">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <a
          href={actionHref}
          className={cn(
            buttonVariants(),
            "mt-2 inline-flex bg-indigo-600 text-white hover:bg-indigo-500"
          )}
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
