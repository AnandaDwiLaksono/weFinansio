"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import AccountModal from "@/components/AccountModal";
import ConfirmationModal from "@/components/ConfirmationModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type Row = {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet" | "investment";
  currency: string;
  balance: string;
  archived: boolean;
  note: string;
  updatedAt: string;
};
type ListRes = {
  items: Row[];
  page: number;
  limit: number;
  total: number
};

export default function AccountsContent() {
  const queryClient = useQueryClient();
  const params = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(params.get("search") || "");
  const [type, setType] = useState((params.get("type") as "all" | "cash" | "bank" | "ewallet" | "investment") || "all");
  const [currency, setCurrency] = useState((params.get("currency") as "all" | "IDR" | "USD" | "EUR") || "all");
  const [archived, setArchived] = useState((params.get("archived") as "all" | "true" | "false") || "all");

  const limit = 20;

  const { data } = useApiQuery<ListRes>(
    ["accounts", { search, page, limit, type, currency, archived }],
    () => api.get("/api/accounts?" + new URLSearchParams({
      search: search,
      page: String(page),
      limit: String(limit),
      type,
      currency,
      archived
    })),
    { placeholderData: keepPreviousData }
  );

  const delMut = useApiMutation<{ ok: true }, { id: string }>(
    ({ id }) => api.del(`/api/accounts/${id}`),
    { 
      onSuccess: () => {
        toast.success("Akun dihapus");
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      }
    }
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const totalSaldo = useMemo(() => items.filter(a => !a.archived).reduce(
    (s, a) => s + Number(a.balance || 0), 0
  ), [items]);
  const activedAccounts = useMemo(() => items.filter(a => !a.archived).length, [items]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-medium mb-4 text-foreground">
            Kelola sumber dana dan rekeningmu
          </h1>
          <Card className="px-4 py-2.5 bg-secondary rounded-xl flex flex-col gap-1 shadow-lg">
            <div className="text-xs font-medium text-muted-foreground tracking-wider">
              TOTAL SALDO
            </div>
            <div className="text-lg font-semibold text-foreground">
              {rupiah(totalSaldo)}
            </div>
          </Card>
        </div>
        <div className="hidden md:block">
          <AccountModal asChild type="add">
            <Button size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Tambah Akun
            </Button>
          </AccountModal>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-4 gap-3 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xs font-medium flex justify-between items-center">
            Filter akun
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearch("");
                setType("all");
                setCurrency("all");
                setArchived("all");
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
                  placeholder="Cari nama akun..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pr-8"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Jenis Akun</label>
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as "all" | "cash" | "bank" | "ewallet" | "investment");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Jenis Akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="bank">Rekening Bank</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                  <SelectItem value="investment">Investasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Mata Uang</label>
              <Select
                value={currency}
                onValueChange={(value) => {
                  setCurrency(value as "all" | "IDR" | "USD" | "EUR");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Mata Uang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select
                value={archived}
                onValueChange={(value) => {
                  setArchived(value as "all" | "true" | "false");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="false">Aktif</SelectItem>
                  <SelectItem value="true">Diarsipkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabel desktop */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-10 gap-3">
        <Card className="lg:col-span-7 shadow-lg p-4 gap-2.5">
          <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold">Daftar Akun</CardTitle>
              <p className="text-xs text-muted-foreground">Kelola semua dompet, rekening bank, e-wallet, dan investasi.</p>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-accent text-xs text-muted-foreground">
              {activedAccounts} akun aktif
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Mata Uang</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a, idx) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {String(idx + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {a.name}
                    </TableCell>
                    <TableCell className="capitalize">
                      {labelType(a.type)}
                    </TableCell>
                    <TableCell>{a.currency}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {rupiah(a.balance)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span className={`h-2 w-2 rounded-full ${a.archived ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        {a.archived ? 'Diarsipkan' : 'Aktif'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.note ? a.note : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-center gap-1.5 items-center">
                        <AccountModal
                          asChild
                          type="edit"
                          id={a.id}
                          initial={{
                            name: a.name,
                            type: a.type,
                            currency: a.currency,
                            balance: Number(a.balance || 0),
                            archived: a.archived,
                            note: a.note || ""
                        }}>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </AccountModal>
                        <ConfirmationModal
                          title="Hapus Akun"
                          description={`Apakah Anda yakin ingin menghapus akun "${a.name}"? Tindakan ini tidak dapat dibatalkan.`}
                          confirmText="Hapus"
                          cancelText="Batal"
                          onConfirm={() => delMut.mutate({ id: a.id })}
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
                      colSpan={8}
                      className="p-6 text-sm text-muted-foreground text-center"
                    >
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-1.5 border-t flex items-center justify-between text-xs text-muted-foreground">
              <div>Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} akun</div>
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

        {/* Ringkasan Akun - Sidebar Kanan */}
        <Card className="lg:col-span-3 hidden md:flex shadow-lg p-4 gap-3">
          <CardHeader className="gap-3">
            <CardTitle className="text-base font-semibold">Ringkasan Akun</CardTitle>
            <p className="text-xs text-muted-foreground">Lihat distribusi saldo berdasarkan jenis akun.</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(() => {
              const byType = items
                .filter(a => !a.archived)
                .reduce((acc, a) => {
                  acc[a.type] = (acc[a.type] || 0) + Number(a.balance || 0);

                  return acc;
                }, {} as Record<string, number>);
              
              const types = [
                { key: 'cash', label: 'Tunai', count: items.filter(a => a.type === 'cash').length },
                { key: 'bank', label: 'Bank', count: items.filter(a => a.type === 'bank').length },
                { key: 'ewallet', label: 'e-Wallet', count: items.filter(a => a.type === 'ewallet').length },
                { key: 'investment', label: 'Investasi', count: items.filter(a => a.type === 'investment').length },
              ];

              return types.map(({ key, label, count }) => {
                const amount = byType[key] || 0;
                const percentage = totalSaldo > 0 ? (amount / totalSaldo) * 100 : 0;
                
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`h-2 w-2 rounded-full ${
                          key === 'cash' ? 'bg-blue-500' : 
                          key === 'bank' ? 'bg-blue-600' : 
                          key === 'ewallet' ? 'bg-blue-400' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground"> · {count} akun</span>
                      </div>
                      <span className="text-sm font-semibold">{rupiah(amount)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          key === 'cash' ? 'bg-blue-500' : 
                          key === 'bank' ? 'bg-blue-600' : 
                          key === 'ewallet' ? 'bg-blue-400' : 'bg-gray-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              });
            })()}
            
            <Separator className="my-3" />
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Akun digunakan sebagai sumber dana di transaksi, laporan, dan budget. Pastikan setiap dompet, rekening, e-wallet yang kamu pakai sudah terdaftar agar laporanmu akurat.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kartu mobile */}
      <div className="md:hidden space-y-2 bg-card rounded-lg shadow-lg p-2.5">
        <div className="flex justify-between items-center gap-2">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Daftar Akun
            </h2>
            <p className="text-xs text-muted-foreground">
              Kelola semua dompet, rekening bank, e-wallet, dan investasi.
            </p>
          </div>
          <div className="px-1.5 py-0.5 rounded-full bg-accent text-xs text-muted-foreground w-1/4">
            {activedAccounts} akun aktif
          </div>
        </div>
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Tidak ada data.
          </div>
        )}
        {items.map((a, idx) => (
          <Card key={a.id} className="bg-secondary p-2">
            <CardContent className="p-2 gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground font-mono">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground mb-1">
                      {a.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {labelType(a.type)} • {a.currency}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {rupiah(a.balance)}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs mt-1 bg-[#10b9811f] px-2 py-0.5 rounded-full text-[#047857] font-medium">
                      <span className={`h-2 w-2 rounded-full ${a.archived ? 'bg-red-500' : 'bg-green-500'}`}></span>
                      {a.archived ? 'Diarsipkan' : 'Aktif'}
                    </span>
                  </div>
                </div>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {a.note ? a.note : '-'}
                </div>
                <div className="flex gap-2">
                  <AccountModal
                    asChild
                    type="edit"
                    id={a.id}
                    initial={{
                      name: a.name,
                      type: a.type,
                      currency: a.currency,
                      balance: Number(a.balance || 0),
                      archived: a.archived,
                      note: a.note || ""
                  }}>
                    <Button variant="default" size="sm" className="h-8 w-8 p-0 rounded-full">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </AccountModal>
                  <ConfirmationModal
                    title="Hapus Akun"
                    description={`Apakah Anda yakin ingin menghapus akun "${a.name}"? Tindakan ini tidak dapat dibatalkan.`}
                    confirmText="Hapus"
                    cancelText="Batal"
                    onConfirm={() => delMut.mutate({ id: a.id })}
                    trigger={
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full text-white"
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

      {/* Ringkasan Mobile */}
      <Card className="md:hidden shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Ringkasan Akun
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const byType = items
              .filter(a => !a.archived)
              .reduce((acc, a) => {
                acc[a.type] = (acc[a.type] || 0) + Number(a.balance || 0);
                return acc;
              }, {} as Record<string, number>);
            
            const types = [
              { key: 'cash', label: 'Tunai', count: items.filter(a => a.type === 'cash').length },
              { key: 'bank', label: 'Bank', count: items.filter(a => a.type === 'bank').length },
              { key: 'ewallet', label: 'e-Wallet', count: items.filter(a => a.type === 'ewallet').length },
              { key: 'investment', label: 'Investasi', count: items.filter(a => a.type === 'investment').length },
            ];

            return types.map(({ key, label, count }) => {
              const amount = byType[key] || 0;
              const percentage = totalSaldo > 0 ? (amount / totalSaldo) * 100 : 0;
              
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        key === 'cash' ? 'bg-blue-500' : 
                        key === 'bank' ? 'bg-blue-600' : 
                        key === 'ewallet' ? 'bg-blue-400' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-sm">{label}</span>
                      <span className="text-xs text-muted-foreground">· {count} akun</span>
                    </div>
                    <span className="text-sm font-semibold">{rupiah(amount)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        key === 'cash' ? 'bg-blue-500' : 
                        key === 'bank' ? 'bg-blue-600' : 
                        key === 'ewallet' ? 'bg-blue-400' : 'bg-gray-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            });
          })()}
        </CardContent>
      </Card>

      {/* FAB tambah akun (mobile) */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <AccountModal asChild type="add">
          <Button
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Tambah akun"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </AccountModal>
      </div>
    </div>
  );
}

function rupiah(n: string | number) {
  const v = typeof n === "string" ? Number(n) : n;
  
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(v || 0);
}

function labelType(t: Row["type"]) {
  switch(t) {
    case "cash": return "Tunai";
    case "bank": return "Rekening Bank";
    case "ewallet": return "E-Wallet";
    case "investment": return "Investasi";
  }
}
