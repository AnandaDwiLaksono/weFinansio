"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type GoalRow = {
  id: string;
  name: string;
  target: number;
  saved: number;
  savedThisMonth: number;
  pct: number;
  dueDate?: string | null;
  progress: number;
  remaining: number;
  color?: string | null;
};

const ITEMS_PER_PAGE = 2;

export default function GoalsPanel() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useApiQuery<GoalRow[]>(
    ["goals-summary"],
    () => api.get("/api/summaries/goals") as Promise<GoalRow[]>,
    { staleTime: 30_000 },
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
    <Card className="gap-2.5">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Goals</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {isLoading && (
          <div className="text-sm text-muted-foreground">Memuat…</div>
        )}
        {error && (
          <div className="text-sm text-red-500">Gagal memuat goals.</div>
        )}
        {!isLoading && !error && (data ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">Belum ada goal.</div>
        )}

        {currentItems.map((g) => (
          <GoalItem key={g.id} {...g} />
        ))}
      </CardContent>

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
    </Card>
  );
}

function GoalItem({ name, target, saved, pct, dueDate, color }: GoalRow) {
  const deg = Math.round((pct || 0) * 283); // ring approx
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 rounded-full">
        <svg viewBox="0 0 36 36" className="h-14 w-14 rotate-[-90deg]">
          <path
            className="text-muted stroke-current"
            strokeWidth="3"
            fill="none"
            d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32"
          />
          <path
            style={{ stroke: color || "currentColor" }}
            strokeWidth="3"
            fill="none"
            strokeDasharray={`${Math.round((pct || 0) * 100)},100`}
            d="M18 2a16 16 0 1 1 0 32 16 16 0 0 1 0-32"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-xs font-medium">
          {Math.round((pct || 0) * 100)}%
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">
          Collected: <b>{rupiah(saved)}</b>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          Target: <b>{rupiah(target)}</b>
        </div>
        {dueDate && (
          <div className="truncate text-xs text-muted-foreground">
            Target Date: <b>{new Date(dueDate).toLocaleDateString("id-ID")}</b>
          </div>
        )}
      </div>
    </div>
  );
}
