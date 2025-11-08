"use client";

import { useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GoalRow = {
  id: string; name: string; target: number; saved: number; savedThisMonth: number; pct: number; dueDate: string | null;
};

export default function GoalsPanel() {
  const { data, isLoading, error } = useApiQuery<GoalRow[]>(
    ["goals-summary"],
    () => api.get("/api/summaries/goals") as Promise<GoalRow[]>,
    { staleTime: 30_000 }
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Goals</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {isLoading && <div className="text-sm text-muted-foreground">Memuat…</div>}
        {error && <div className="text-sm text-red-500">Gagal memuat goals.</div>}
        {!isLoading && !error && (data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada goal.</div>
        )}

        {(data ?? []).map((g) => (
          <GoalItem key={g.id} {...g} />
        ))}
      </CardContent>
    </Card>
  );
}

function GoalItem({ name, target, saved, pct, dueDate }: GoalRow) {
  const deg = Math.round((pct || 0) * 283); // ring approx
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 rounded-full">
        <svg viewBox="0 0 36 36" className="h-14 w-14 rotate-[-90deg]">
          <path className="text-muted stroke-current" strokeWidth="3" fill="none" d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" />
          <path className="text-primary stroke-current" strokeWidth="3" fill="none"
            strokeDasharray={`${Math.round((pct || 0) * 100)},100`} d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32" />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-xs font-medium">{Math.round((pct || 0) * 100)}%</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {rupiah(saved)} / {rupiah(target)} {dueDate ? `• target ${new Date(dueDate).toLocaleDateString("id-ID")}` : ""}
        </div>
      </div>
    </div>
  );
}

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
}
