import { Suspense } from "react";
import GoalsContent from "./content";

export default function GoalsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      }
    >
      <GoalsContent />
    </Suspense>
  );
}
