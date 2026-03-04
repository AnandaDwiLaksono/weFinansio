import { Suspense } from "react";
import PortfolioContent from "./content";

export default function PortfolioPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-32 bg-muted animate-pulse rounded" />
        </div>
      }
    >
      <PortfolioContent />
    </Suspense>
  );
}
