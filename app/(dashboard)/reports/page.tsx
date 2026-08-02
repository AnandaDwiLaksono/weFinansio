import { Suspense } from "react";
import ReportsContent from "./content";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}