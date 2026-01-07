"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, Search } from "lucide-react";

import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getIconByName } from "@/lib/icons";
import TransactionModal from "@/components/TransactionModal";
import ConfirmationModal from "@/components/ConfirmationModal";

type Row = {
  id: string;
  occurredAt: string;
  amount: string;
  type: "income" | "expense" | "transfer";
  notes: string | null;
  accountId: string;
  categoryId: string;
  accountName: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  transferToAccountId: string;
  transferToAccountName: string;
};

type ListRes = { items: Row[]; page: number; limit: number; total: number };

export default function TransactionsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(params.get("search") || "");
  const [type, setType] = useState((params.get("type") as "all" | "income" | "expense" | "transfer") || "all");
  const [accountId, setAccount] = useState(params.get("accountId") || "all");
  const [categoryId, setCategory] = useState(params.get("categoryId") || "all");
  const [dateFrom, setFrom] = useState(params.get("dateFrom") || "");
  const [dateTo, setTo] = useState(params.get("dateTo") || "");
  const [sort, setSort] = useState(params.get("sort") || "date_desc");
  const [page, setPage] = useState(Number(params.get("page") || 1));

  const limit = 20;

  // fetch filter sources
  const { data: accounts } = useApiQuery<{
    items: { id: string; name: string }[];
  }>(["acc-filter"], () => api.get("/api/accounts"), { staleTime: 60_000 });

  const { data: categories } = useApiQuery<{
    items: { id: string; name: string; kind: "income" | "expense" }[];
  }>(["cat-filter"], () => api.get("/api/categories"), { staleTime: 60_000 });

  const queryKey = useMemo(
    () => [
      "transactions",
      { page, limit, search, type, accountId, categoryId, dateFrom, dateTo, sort },
    ],
    [page, limit, search, type, accountId, categoryId, dateFrom, dateTo, sort]
  );

  const { data } = useApiQuery<ListRes>(
    queryKey,
    () =>
      api.get(`/api/transactions?` + new URLSearchParams({
        search,
        type,
        accountId,
        categoryId,
        dateFrom,
        dateTo,
        sort,
        page: String(page),
        limit: String(limit),
      })),
      { staleTime: 10_000 }
  );

  // sync URL
  useEffect(() => {
    const qs = new URLSearchParams({
      page: String(page),
      search,
      sort,
      ...(type ? { type } : {}),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    });

    router.replace(`/transactions?${qs.toString()}`);
  }, [page, search, sort, type, accountId, categoryId, dateFrom, dateTo, router]);

  // delete
  const delMut = useApiMutation<{ ok: true }, { id: string }>(
    ({ id }) => api.del(`/api/transactions/${id}`)
  );

  const deleteGoalContribution = useApiMutation<{ ok: true }, { id: string }>(
    ({ id }) => api.del(`/api/goals/${id}/contributions`),
    { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }) }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Kelola transaksi harianmu
          </h1>
        </div>
        <div className="hidden md:block">
          <TransactionModal
            asChild
            type ="add"
            accounts={accounts?.items ?? []}
            categories={categories?.items ?? []}
            id=""
          >
            <Button size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Tambah Transaksi
            </Button>
          </TransactionModal>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 gap-3 shadow-lg">
        <CardHeader>
          <CardTitle className="font-medium flex justify-between items-center">
            Filter transaksi
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setType("all");
                setAccount("all");
                setCategory("all");
                setFrom("");
                setTo("");
                setSort("date_desc");
                setPage(1);
              }}
            >
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pencarian</label>
              <div className="relative">
                <Input
                  placeholder="Cari catatan..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pr-8"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tipe transaksi
              </label>
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as "all" | "income" | "expense" | "transfer");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Tipe Transaksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Akun</label>
              <Select
                value={accountId}
                onValueChange={(value) => { setAccount(value); setPage(1); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {(accounts?.items ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
              <Select
                value={categoryId}
                onValueChange={(value) => { setCategory(value); setPage(1); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {(categories?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tanggal awal
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tanggal akhir
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Urutkan berdasarkan
              </label>
              <Select
                value={sort}
                onValueChange={(value) => { setSort(value); setPage(1); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Urutkan berdasarkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Terbaru</SelectItem>
                  <SelectItem value="date_asc">Terlama</SelectItem>
                  <SelectItem value="amount_desc">Nominal terbesar</SelectItem>
                  <SelectItem value="amount_asc">Nominal terkecil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel desktop */}
      <Card className="hidden md:block shadow-lg p-4 gap-2.5">
        <CardHeader className="pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Daftar Transaksi</CardTitle>
            <p className="text-xs text-muted-foreground">
              Pantau dan kelola semua transaksi keuanganmu di sini.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Separator />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">No.</TableHead>
                <TableHead className="text-center">Tanggal</TableHead>
                <TableHead className="text-center">Tipe</TableHead>
                <TableHead className="text-center">Akun</TableHead>
                <TableHead className="text-center">Kategori</TableHead>
                <TableHead className="text-center">Catatan</TableHead>
                <TableHead className="text-center">Jumlah</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono text-center">
                    {String((page - 1) * limit + i + 1).padStart(2, '0')}
                  </TableCell>
                  <TableCell>
                    {new Date(t.occurredAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="capitalize text-center">
                    <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.type === "income" ? "bg-green-100 text-green-800" : t.type === "expense" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {t.type === "income" ? "Pemasukan" : t.type === "expense" ? "Pengeluaran" : "Transfer"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.accountName}
                    {t.type === "transfer" && "  →  " + t.transferToAccountName}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const Icon = getIconByName(t.categoryIcon);
                      return (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            // backgroundColor: t.categoryColor || "#eef2ff",
                            color: t.categoryColor || "#0f172a",
                          }}
                        >
                          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                          {t.categoryName ?? "-"}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                    {t.notes}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {rupiah(t.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-center gap-1.5 items-center">
                      <TransactionModal
                        asChild
                        type ="edit"
                        accounts={accounts?.items ?? []}
                        categories={categories?.items ?? []}
                        id={t.id}
                        initial={{
                          occurredAt: t.occurredAt,
                          type: t.type,
                          accountId: t.accountId,
                          transferToAccountId: t.transferToAccountId,
                          categoryId: t.categoryId,
                          amount: t.amount,
                          note: t.notes || "",
                        }}
                      >
                        <Button
                          variant="secondary"
                          size="icon"
                          aria-label="Edit"
                          className="h-7 w-7 rounded-full"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TransactionModal>
                      <ConfirmationModal
                        title="Hapus Transaksi"
                        description={`Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.`}
                        confirmText="Hapus"
                        cancelText="Batal"
                        onConfirm={() => {
                          delMut.mutate({ id: t.id }, {
                            onSuccess: async () => {
                              await deleteGoalContribution.mutateAsync({ id: t.id });

                              queryClient.invalidateQueries({ queryKey: ["transactions"] });

                              toast.success("Transaksi dihapus");
                            }
                          });
                        }}
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

              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="p-6 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="p-1.5 border-t flex items-center justify-between text-xs text-muted-foreground">
            <div>Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} transaksi</div>
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
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2 bg-card rounded-lg shadow-lg p-2.5">
        <div className="flex justify-between items-center gap-2">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Daftar Transaksi
            </h2>
            <p className="text-xs text-muted-foreground">
              Pantau dan kelola semua transaksi keuanganmu di sini.
            </p>
          </div>
        </div>
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Tidak ada data.
          </div>
        )}
        {items.map((t, i) => (
          <Card key={t.id} className="bg-secondary p-2">
            <CardContent className="p-2 gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground font-mono">
                    {String((page - 1) * limit + i + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0">
                    {(() => {
                      const Icon = getIconByName(t.categoryIcon);
                      return (
                        <div
                          className="inline-flex items-center gap-1 text-sm font-medium"
                          style={{ color: t.categoryColor || "#0f172a" }}
                        >
                          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                          {t.categoryName ?? "-"}
                        </div>
                      );
                    })()}
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.occurredAt).toLocaleString("id-ID").split(",")[0]} •{" "}
                      {t.accountName}
                      {t.type === "transfer" && "  →  " + t.transferToAccountName}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1.5 text-xs mt-1 px-2 py-0.5 rounded-full ${t.type === "income" ? "bg-green-100 text-green-800" : t.type === "expense" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"} font-medium`}>
                      {t.type === "income" ? "Pemasukan" : t.type === "expense" ? "Pengeluaran" : "Transfer"}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {rupiah(t.amount)}
                    </div>
                  </div>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {t.notes ? t.notes : '-'}
                </div>
                <div className="flex gap-2">
                  <TransactionModal
                    asChild
                    type ="edit"
                    accounts={accounts?.items ?? []}
                    categories={categories?.items ?? []}
                    id={t.id}
                    initial={{
                      occurredAt: t.occurredAt,
                      type: t.type,
                      accountId: t.accountId,
                      transferToAccountId: t.transferToAccountId,
                      categoryId: t.categoryId,
                      amount: t.amount,
                      note: t.notes || "",
                    }}
                  >
                    <Button
                      variant="default"
                      size="sm"
                      aria-label="Edit"
                      className="h-8 w-8 rounded-full"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TransactionModal>
                  <ConfirmationModal
                    title="Hapus Transaksi"
                    description={`Apakah Anda yakin ingin menghapus transaksi ini? Tindakan ini tidak dapat dibatalkan.`}
                    confirmText="Hapus"
                    cancelText="Batal"
                    onConfirm={() => {
                      delMut.mutate({ id: t.id }, {
                        onSuccess: async () => {
                          await deleteGoalContribution.mutateAsync({ id: t.id });

                          queryClient.invalidateQueries({ queryKey: ["transactions"] });

                          toast.success("Transaksi dihapus");
                        }
                      });
                    }}
                    trigger={
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 text-white rounded-full"
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
        ))}

        {/* Pagination mobile */}
        <div className="md:hidden flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Total {total} akun
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      {/* FAB Mobile */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <TransactionModal
          asChild
          type ="add"
          accounts={accounts?.items ?? []}
          categories={categories?.items ?? []}
          id=""
        >
          <Button className="h-12 w-12 rounded-full shadow-lg" aria-label="Tambah transaksi">
            <Plus className="h-5 w-5" />
          </Button>
        </TransactionModal>
      </div>
    </div>
  );
}

function rupiah(n: string | number) {
  const v = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v || 0);
}
