"use client";

import { useApiQuery, api } from "@/lib/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type BudgetRow = {
  categoryId: string;
  categoryName: string;
  planned: number;
  spent: number;
  remain: number;
  pct: number;
};

export default function BudgetPanel() {
  const { data, isLoading, error } = useApiQuery<BudgetRow[]>(
    ["budget-summary"],
    () => api.get("/api/budgets/summary"),
    { staleTime: 30_000 }
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Budget (bulan ini)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <div className="text-sm text-muted-foreground">Memuat…</div>}
        {error && <div className="text-sm text-red-500">Gagal memuat budget.</div>}
        {!isLoading && !error && (data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada budget.</div>
        )}

        {(data ?? []).map((b) => (
          <div key={b.categoryId} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-sm">{b.categoryName}</div>
              <div className="shrink-0 text-sm">
                <Badge variant={b.pct >= 1 ? "destructive" : "secondary"}>
                  {pct(b.pct)} • {rupiah(b.remain)} sisa
                </Badge>
              </div>
            </div>
            <Progress value={Math.min(b.pct * 100, 100)} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Terpakai {rupiah(b.spent)}</span>
              <span>Rencana {rupiah(b.planned)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
}
function pct(p: number) { return `${Math.round((p || 0) * 100)}%`; }
