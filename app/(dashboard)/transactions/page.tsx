import { Suspense } from "react";
import TransactionsContent from "./content";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-32 bg-muted animate-pulse rounded" /></div>}>
      <TransactionsContent />
    </Suspense>
  );
}
