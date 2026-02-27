"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, PiggyBank, Plus, Search } from "lucide-react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GoalContributionModal from "@/components/GoalContributionModal";
import { Badge } from "@/components/ui/badge";
import GoalModal from "@/components/GoalModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmationModal from "@/components/ConfirmationModal";
import { rupiah } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  target: number;
  saved: number;
  progress: number;
  remaining: number;
  targetDate?: string | null;
  linkedAccountId?: string | null;
  color?: string | null;
  archived: boolean;
  note: string | null;
  startAmount: number;
};
type ListRes = {
  items: Row[];
  page: number;
  limit: number;
};

export default function GoalsContent() {
  const queryClient = useQueryClient();
  const params = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(params.get("search") || "");
  const [archived, setArchived] = useState(
    (params.get("archived") as "all" | "true" | "false") || "all"
  );
  const [statusFilter, setStatusFilter] = useState(
    (params.get("status") as
      | "all"
      | "ontrack"
      | "almost"
      | "completed"
      | "overdue") || "all"
  );

  const limit = 20;

  const { data } = useApiQuery<ListRes>(
    ["goals", { page, search, archived, statusFilter }],
    () =>
      api.get(
        "/api/goals?" +
          new URLSearchParams({
            page: String(page),
            limit: String(limit),
            search: search,
            archived: archived,
          })
      ),
    { staleTime: 10_000, placeholderData: keepPreviousData }
  );

  const { data: accsData } = useApiQuery<{
    items: { id: string; name: string }[];
  }>(["accounts-list"], () => api.get("/api/accounts"), { staleTime: 60_000 });

  const del = useApiMutation<{ ok: true }, { id: string }>(
    ({ id }) => api.del(`/api/goals/${id}`),
    {
      onSuccess: () => {
        toast.success("Goal dihapus");
        queryClient.invalidateQueries({ queryKey: ["goals"] });
      },
    }
  );

  const rawItems = data?.items ?? [];
  const accountsMap = new Map(
    (accsData?.items ?? []).map((a) => [a.id, a.name])
  );

  const items = rawItems.filter((g) => {
    const today = new Date();
    const pct = g.progress || 0;
    const hasTargetDate = !!g.targetDate;
    const targetDate = hasTargetDate ? new Date(g.targetDate!) : null;
    const isOverdue = hasTargetDate && pct < 1 && targetDate! < today;

    switch (statusFilter) {
      case "completed":
        return pct >= 1;
      case "almost":
        return pct >= 0.8 && pct < 1;
      case "ontrack":
        return pct > 0 && pct < 0.8 && !isOverdue;
      case "overdue":
        return isOverdue;
      default:
        return true;
    }
  });

  const total = items?.length || 0;
  const pages = Math.ceil(total / limit);
  const activedGoals = useMemo(
    () => items.filter((g) => !g.archived).length,
    [items]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Pantau progres tujuan finansialmu
          </h1>
        </div>
        <div className="hidden md:block">
          <GoalModal type="add" asChild>
            <Button size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Tambah Goal
            </Button>
          </GoalModal>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-4 gap-3 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xs font-medium flex justify-between items-center">
            Filter Goal
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearch("");
                setArchived("all");
                setStatusFilter("all");
              }}
            >
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Pencarian
              </label>
              <div className="relative">
                <Input
                  placeholder="Cari nama goal..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pr-8"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Status Goal
              </label>
              <Select
                value={archived}
                onValueChange={(value) => {
                  setArchived(value as "all" | "true" | "false");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Status Goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="false">Aktif</SelectItem>
                  <SelectItem value="true">Diarsipkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Progress Goal
              </label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(
                    value as
                      | "all"
                      | "completed"
                      | "almost"
                      | "ontrack"
                      | "overdue"
                  );
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Progress Goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="ontrack">On track</SelectItem>
                  <SelectItem value="almost">Hampir tercapai</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4 bg-card rounded-lg shadow-lg p-4 border">
        {/* Header List */}
        <div className="flex justify-between items-center gap-2">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Daftar Goal
            </h2>
            <p className="text-xs text-muted-foreground">
              Kelola dan pantau tujuan finansialmu
            </p>
          </div>
          <div className="px-3 py-1 rounded-full bg-accent text-xs text-muted-foreground w-fit">
            {activedGoals} goal aktif
          </div>
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Belum ada goal. Tambahkan dulu.
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((g) => {
            const tag = getGoalStatus(g);
            console.log(tag);
            const linkedAccName = g.linkedAccountId
              ? accountsMap.get(g.linkedAccountId)
              : null;
            return (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle className="text-base flex justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="truncate flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded"
                          style={{ background: g.color || "#3b82f6" }}
                        />
                        {g.name}
                      </div>
                      {g.targetDate && (
                        <span className="text-xs text-muted-foreground">
                          Tanggal target: {fmtDate(g.targetDate)}
                        </span>
                      )}
                      {linkedAccName && (
                        <p className="text-xs text-muted-foreground">
                          🔗 Akun terhubung: <strong>{linkedAccName}</strong>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="default"
                        className={`text-[10px] px-2 py-0 ${
                          g.archived
                            ? "bg-red-500/10 text-red-700"
                            : "bg-green-500/10 text-green-700"
                        }`}
                      >
                        {g.archived ? "Diarsipkan" : "Aktif"}
                      </Badge>
                      <Badge
                        variant={tag.variant}
                        className={`text-[10px] px-2 py-0 ${tag.color}`}
                      >
                        {tag.label}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Ring progress={g.progress} color={g.color || "#3b82f6"} />
                    <div className="text-sm">
                      <div>
                        Target: <strong>{rupiah(g.target)}</strong>
                      </div>
                      <div>
                        Terkumpul: <strong>{rupiah(g.saved)}</strong>
                      </div>
                      <div className="text-muted-foreground">
                        Sisa: {rupiah(g.remaining)}
                      </div>
                    </div>
                  </div>
                  {g.note && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      Catatan: {g.note}
                    </div>
                  )}
                  <div className="mt-4 flex justify-between gap-2">
                    <GoalContributionModal
                      goalId={g.id}
                      goalName={g.name}
                      goalLinkedAccountId={g.linkedAccountId || null}
                    >
                      <Button variant="secondary" size="sm">
                        <PiggyBank className="h-4 w-4 mr-1" />
                        Tambah
                      </Button>
                    </GoalContributionModal>
                    <div className="flex gap-2">
                      <GoalModal
                        type="edit"
                        asChild
                        id={g.id}
                        initial={{
                          name: g.name,
                          targetAmount: g.target,
                          targetDate: g.targetDate?.toString() || "",
                          startAmount: g.startAmount,
                          linkedAccountId: g.linkedAccountId || "",
                          archived: g.archived,
                          note: g.note || "",
                          color: g.color || "#3b82f6",
                        }}
                      >
                        <Button variant="outline" size="icon" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </GoalModal>
                      <ConfirmationModal
                        title="Hapus Goal"
                        description={`Apakah Anda yakin ingin menghapus goal "${g.name}"? Tindakan ini tidak dapat dibatalkan.`}
                        confirmText="Hapus"
                        cancelText="Batal"
                        onConfirm={() => del.mutate({ id: g.id })}
                        trigger={
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="p-1.5 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Menampilkan {(page - 1) * limit + 1} -{" "}
            {Math.min(page * limit, total)} dari {total} goal
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      {/* FAB tambah goal (mobile) */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <GoalModal asChild type="add">
          <Button
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Tambah goal"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </GoalModal>
      </div>
    </div>
  );
}

function fmtDate(s?: string | null) {
  return s ? new Date(s).toLocaleDateString("id-ID") : "";
}

// Ring progress (conic-gradient, ringan)
function Ring({ progress, color }: { progress: number; color: string }) {
  const pct = Math.round((progress || 0) * 100);
  return (
    <div className="relative h-16 w-16">
      <div
        className="h-16 w-16 rounded-full"
        style={{
          background: `conic-gradient(${color} ${pct}%, #e5e7eb ${pct}%)`,
        }}
      />
      <div className="absolute inset-2 bg-background rounded-full grid place-items-center text-xs font-medium">
        {pct}%
      </div>
    </div>
  );
}

function getGoalStatus(g: Row): {
  label: string;
  variant: "default" | "secondary" | "destructive";
  color: string;
} {
  const pct = g.progress || 0;
  const today = new Date();
  const hasTarget = !!g.targetDate;
  const targetDate = hasTarget ? new Date(g.targetDate!) : null;
  const isOverdue = hasTarget && pct < 1 && targetDate! < today;

  if (pct >= 1) return { label: "Selesai", variant: "default", color: "bg-green-500/10 text-green-700" };
  if (isOverdue) return { label: "Overdue", variant: "destructive", color: "bg-red-500/10 text-red-700" };
  if (pct >= 0.8) return { label: "Hampir tercapai", variant: "default", color: "bg-yellow-500/10 text-yellow-700" };
  if (pct > 0) return { label: "On track", variant: "secondary", color: "bg-blue-500/10 text-blue-700" };
  return { label: "Belum mulai", variant: "secondary", color: "bg-gray-500/10 text-gray-700" };
}
