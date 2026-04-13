import { Suspense } from "react";

import { ReportView } from "@/components/crucible/report-view";

export default function ReportPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading report…</p>}>
      <ReportView />
    </Suspense>
  );
}
