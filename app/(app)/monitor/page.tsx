import { Suspense } from "react";

import { MonitorView } from "@/components/crucible/monitor-view";

export default function MonitorPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading monitor…</p>}>
      <MonitorView />
    </Suspense>
  );
}
