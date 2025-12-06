import { Suspense } from "react";
import BudgetsContent from "./content";

export default function BudgetsPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-32 bg-muted animate-pulse rounded" /></div>}>
      <BudgetsContent />
    </Suspense>
  );
}
