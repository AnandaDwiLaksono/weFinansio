import { Suspense } from "react";
import DashboardContent from "./content";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
