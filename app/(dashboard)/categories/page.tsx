import { Suspense } from "react";
import CategoriesContent from "./content";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-32 bg-muted animate-pulse rounded" /></div>}>
      <CategoriesContent />
    </Suspense>
  );
}
