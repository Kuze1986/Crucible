import { Suspense } from "react";

import { BuilderWizard } from "@/components/crucible/builder-wizard";

export default function BuilderPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading builder…</p>}>
      <BuilderWizard />
    </Suspense>
  );
}
