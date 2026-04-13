import { Suspense } from "react";

import { CompareView } from "@/components/crucible/compare-view";

export default function ComparePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading comparison…</p>}>
      <CompareView />
    </Suspense>
  );
}
