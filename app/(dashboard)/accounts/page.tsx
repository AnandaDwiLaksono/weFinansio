import { Suspense } from "react";
import AccountsContent from "./content";

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-32 bg-muted animate-pulse rounded" /></div>}>
      <AccountsContent />
    </Suspense>
  );
}
