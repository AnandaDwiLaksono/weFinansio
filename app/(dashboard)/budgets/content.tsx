"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Search, Copy } from "lucide-react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import BudgetModal from "@/components/BudgetModal";
import EditBudgetModal from "@/components/EditBudgetModal";
import BudgetDonut from "@/components/BudgetDonut";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmationModal from "@/components/ConfirmationModal";

type Item = {
  id: string;
  period: string;
  limit: number;
  accumulatedCarryover: number;
  effectiveLimit: number;
  spent: number;
  remaining: number;
  progress: number;
  categoryId: string;
  categoryName: string;
};
type Res = {
  period: string;
  items: Item[];
  total: {
    limit: number;
    effectiveLimit: number;
    spent: number;
    remaining: number;
    almostOver: number;
    overBudget: number;
  };
};

export default function BudgetsContent() {
  const queryClient = useQueryClient();

  const { data: user } = useApiQuery<{
    settings: { startDatePeriod: number }
  }>(
    ["settings"],
    () => api.get("/api/settings"),
    { placeholderData: keepPreviousData }
  );

  const startDate = Number(user?.settings.startDatePeriod ?? 1);

  const [period, setPeriod] = useState(currentPeriod(startDate));
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const limit = 20;

  const { data } = useApiQuery<Res>(
    ["budgets", { period, q }],
    () => {
      const params = new URLSearchParams({ period, q });

      return api.get("/api/budgets?" + params.toString());
    },
    { placeholderData: keepPreviousData }
  );

  const del = useApiMutation<{ ok: true }, { id: string }>(
    ({ id }) => api.del(`/api/budgets/${id}`),
    { onSuccess: () => {
        toast.success("Budget dihapus");
        queryClient.invalidateQueries({ queryKey: ["budgets"] })
      }
    }
  );

  const copyLast = useApiMutation<{ ok: true, copied: number }, { period: string }>(
    ({ period }) => api.post(`/api/budgets/copy?period=${period}`),
    { 
      onSuccess: (copy) => {
        toast.success(`${copy?.copied ?? 0} budget dari periode sebelumnya berhasil disalin.`);
        queryClient.invalidateQueries({ queryKey: ["budgets"] });
      }
    }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? {
    limit: 0,
    effectiveLimit: 0,
    spent: 0,
    remaining: 0,
    almostOver: 0,
    overBudget: 0
  };

  console.log({ items, total, period });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 text-sm text-muted-foreground">
          <h1 className="text-xl font-medium mb-4 text-foreground text-wrap">
            Kelola dan pantau alokasi pengeluaran Anda per kategori.
          </h1>
          <div className="flex flex-wrap gap-2">
            <p>
              Periode {period} 
            </p>
            <div className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              Total Budget: {rupiah(total.effectiveLimit)}
            </div>
            <div className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
              Terpakai: {rupiah(total.spent)}
            </div>
            <div className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              Sisa: {rupiah(total.remaining)}
            </div>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <BudgetModal
            asChild
            type="add"
            startDate={startDate}
          >
            <Button size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Tambah Budget
            </Button>
          </BudgetModal>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-4 gap-3 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xs font-medium flex justify-between items-center">
            Filter budget
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setQ("");
                setPeriod(currentPeriod(startDate));
              }}
            >
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pencarian</label>
              <div className="relative">
                <Input
                  placeholder="Cari nama kategori..."
                  value={q}
                  onChange={(e) => { setQ(e.target.value); }}
                  className="w-full pr-8"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Periode Budget</label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-xs text-muted-foreground mb-1 block">Copy dari periode sebelumnya</label>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => copyLast.mutate({ period })}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel desktop */}
      <Card className="shadow-lg p-4 hidden md:block space-y-4">
        <CardHeader className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-semibold">
              Ringkasan Budget
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Lihat alokasi dan realisasi budget per kategori.
            </p>
          </div>
          <div className="flex gap-2.5 flex-wrap text-muted-foreground text-xs">
            <div className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Sudah terpakai {((total.spent / total.effectiveLimit) * 100).toFixed(2)}%
            </div>
            <div className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
              {total.almostOver} kategori mendekati limit
            </div>
            <div className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              {total.overBudget} kategori over budget
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Separator />
          {items.length === 0 && (
            <div className="flex justify-center items-center px-4 py-10 text-sm">
              <div className="text-center space-y-3">
                <p className="font-medium">
                  Belum ada budget untuk periode ini
                </p>
                <p className="text-muted-foreground">
                  Tambahkan budget untuk mulai mengelola pengeluaran Anda per kategori.
                </p>
              </div>
            </div>
          )}
          {items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Sisa Budget Periode Sebelumnya</TableHead>
                    <TableHead>Total Budget</TableHead>
                    <TableHead>Terpakai</TableHead>
                    <TableHead>Sisa</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a, idx) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {String(idx + 1).padStart(2, '0')}
                      </TableCell>
                      <TableCell className="font-medium capitalize">
                        {a.categoryName}
                      </TableCell>
                      <TableCell className="text-right">
                        {rupiah(a.limit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rupiah(a.accumulatedCarryover)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rupiah(a.effectiveLimit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rupiah(a.spent)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rupiah(a.remaining)}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-muted-foreground mb-1">
                          {Math.round(a.progress * 100)}% terpakai
                        </p>
                        <Progress value={Math.round(a.progress * 100)} className="h-2" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-center gap-1.5 items-center">
                          <BudgetModal
                            asChild
                            type="edit">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </BudgetModal>
                          <ConfirmationModal
                            title="Hapus Budget"
                            description={`Apakah Anda yakin ingin menghapus budet "${a.categoryName}"? Tindakan ini tidak dapat dibatalkan.`}
                            confirmText="Hapus"
                            cancelText="Batal"
                            onConfirm={() => del.mutate({ id: a.id })}
                            trigger={
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7 text-white rounded-full"
                                aria-label="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-1.5 border-t flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, items.length)} dari {items.length} budget</div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= Math.ceil(items.length / limit)}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Kartu mobile */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <span className="truncate">{b.categoryName}</span>
                <span className="text-xs rounded px-2 py-0.5 bg-muted capitalize">
                  {b.period}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>
                  Limit: <strong>{rupiah(b.limit)}</strong>
                </span>
                <span>
                  Spent:{" "}
                  <strong className={b.spent > b.limit ? "text-red-600" : ""}>
                    {rupiah(b.spent)}
                  </strong>
                </span>
              </div>
              <Progress value={Math.round(b.progress * 100)} className="h-2" />
              <div className="mt-2 text-sm text-muted-foreground">
                Sisa: <strong>{rupiah(b.remaining)}</strong>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <EditBudgetModal
                  id={b.id}
                  initial={{ limitAmount: b.limit, carryover: false }}
                >
                  <Button variant="outline" size="icon" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </EditBudgetModal>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="Hapus"
                  onClick={() => del.mutate({ id: b.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* FAB tambah akun (mobile) */}
      <div className="md:hidden fixed bottom-16 right-4 z-40 shadow-lg">
        <BudgetModal asChild type="add">
          <Button
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Tambah akun"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </BudgetModal>
      </div>
    </div>
  );
}

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function currentPeriod(startDate: number = 1) {
  const [y, m, d] = new Date().toISOString().split("T")[0].split("-").map(Number);
  if (d < startDate) {
    const prevMonth = m - 1 === 0 ? 12 : m - 1;
    const prevYear = prevMonth === 12 ? y - 1 : y;
    console.log({ result: `${prevYear}-${String(prevMonth).padStart(2, "0")}` });
    return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  } else {
    return `${y}-${String(m).padStart(2, "0")}`;
  }
}
