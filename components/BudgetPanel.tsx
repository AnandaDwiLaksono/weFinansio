"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rupiah, percentage } from "@/lib/utils";

type BudgetRow = {
  categoryId: string;
  categoryName: string;
  planned: number;
  spent: number;
  remain: number;
  pct: number;
};

const ITEMS_PER_PAGE = 5;

export default function BudgetPanel() {
  const [currentPage, setCurrentPage] = useState(1);
  
  const { data, isLoading, error } = useApiQuery<BudgetRow[]>(
    ["budget-summary"],
    () => api.get("/api/summaries/budgets") as Promise<BudgetRow[]>,
    { staleTime: 30_000 }
  );

  const totalItems = data?.length ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = (data ?? []).slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Budget (periode ini)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <div className="text-sm text-muted-foreground">Memuat…</div>}
        {error && <div className="text-sm text-red-500">Gagal memuat budget.</div>}
        {!isLoading && !error && totalItems === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada budget.</div>
        )}

        {currentItems.map((b) => (
          <div key={b.categoryId} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-sm">{b.categoryName}</div>
              <div className="shrink-0 text-sm">
                <Badge variant={b.pct >= 1 ? "destructive" : "secondary"}>
                  {percentage(b.pct)} • Sisa: {rupiah(b.remain)}
                </Badge>
              </div>
            </div>
            <Progress value={Math.min(b.pct * 100, 100)} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Terpakai: <b>{rupiah(b.spent)}</b></span>
              <span>Budget: <b>{rupiah(b.planned)}</b></span>
            </div>
          </div>
        ))}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
