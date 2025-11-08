"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import AddTransactionModal from "@/components/AddTransactionModal";
import { Trash2, Pencil, Plus } from "lucide-react";
import EditTransactionModal from "@/components/EditTransactionModal";
import { thisMonthRange, thisWeekRange, thisYearRange } from "@/lib/date-ranges";

type Row = {
  id: string;
  occurredAt: string;
  amount: string;
  type: "income" | "expense";
  notes: string | null;
  accountId: string;
  categoryId: string | null;
  accountName: string | null;
  categoryName: string | null;
};

type ListRes = { items: Row[]; page: number; limit: number; total: number };

export default function TransactionsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [type, setType] = useState<"income" | "expense" | "">((sp.get("type") as "income" | "expense" | null) || "");
  const [accountId, setAccount] = useState(sp.get("accountId") || "");
  const [categoryId, setCategory] = useState(sp.get("categoryId") || "");
  const [dateFrom, setFrom] = useState(sp.get("dateFrom") || "");
  const [dateTo, setTo] = useState(sp.get("dateTo") || "");
  const [sort, setSort] = useState(sp.get("sort") || "date_desc");
  const [page, setPage] = useState(Number(sp.get("page") || 1));
  const limit = 20;

  // fetch filter sources
  const { data: accounts } = useApiQuery<{items: {id:string; name:string}[]}>(
    ["acc-filter"], () => api.get("/api/accounts"), { staleTime: 60_000 }
  );
  const { data: categories } = useApiQuery<{items: {id:string; name:string; kind:"income"|"expense"}[]}>(
    ["cat-filter"], () => api.get("/api/categories"), { staleTime: 60_000 }
  );

  const queryKey = useMemo(() => ([
    "transactions", { page, limit, q, type, accountId, categoryId, dateFrom, dateTo, sort }
  ]), [page, limit, q, type, accountId, categoryId, dateFrom, dateTo, sort]);

  const { data, isLoading, error } = useApiQuery<ListRes>(
    queryKey,
    () => api.get(`/api/transactions?` + new URLSearchParams({
      page: String(page), limit: String(limit),
      q, sort,
      type: type || "",
      accountId, categoryId,
      dateFrom, dateTo
    })),
    { staleTime: 10_000 }
  );

  // sync URL
  useEffect(() => {
    const qs = new URLSearchParams({
      page: String(page), q, sort,
      ...(type ? { type } : {}),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    });
    router.replace(`/transactions?${qs.toString()}`);
  }, [page, q, sort, type, accountId, categoryId, dateFrom, dateTo, router]);

  // delete
  const delMut = useApiMutation<{ok:true}, {id:string}>(
    ({ id }) => api.del(`/api/transactions/${id}`),
    { onSuccess: () => toast.success("Transaksi dihapus") }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transaksi</h1>
          <p className="text-sm text-muted-foreground">Kelola transaksi harianmu</p>
        </div>
        <div className="hidden md:block">
          <AddTransactionModal 
            accounts={accounts?.items ?? []}
            categories={categories?.items ?? []}
            userId=""
           />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-6">
          <Input placeholder="Cari (catatan/akun/kategori)" value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} className="md:col-span-2" />
          <Select value={type} onValueChange={(v)=>{ setType(v as "income" | "expense" | ""); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Semua tipe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
          <Select value={accountId} onValueChange={(v)=>{ setAccount(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Semua akun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {/* {(accounts?.items ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)} */}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={(v)=>{ setCategory(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Semua kategori" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {(categories?.items ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e)=>{ setFrom(e.target.value); setPage(1); }} />
          <Input type="date" value={dateTo} onChange={(e)=>{ setTo(e.target.value); setPage(1); }} />
          <div className="md:col-span-6 flex gap-2">
            <Select value={sort} onValueChange={(v)=>{ setSort(v); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Terbaru</SelectItem>
                <SelectItem value="date_asc">Terlama</SelectItem>
                <SelectItem value="amount_desc">Nominal terbesar</SelectItem>
                <SelectItem value="amount_asc">Nominal terkecil</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" size="sm" onClick={()=>{
              const { start, end } = thisWeekRange();
              setFrom(start.toISOString().slice(0,10));
              setTo(end.toISOString().slice(0,10));
              setPage(1);
            }}>Minggu ini</Button>
            <Button variant="secondary" size="sm" onClick={()=>{
              const { start, end } = thisMonthRange();
              setFrom(start.toISOString().slice(0,10));
              setTo(end.toISOString().slice(0,10));
              setPage(1);
            }}>Bulan ini</Button>
            <Button variant="secondary" size="sm" onClick={()=>{
              const { start, end } = thisYearRange();
              setFrom(start.toISOString().slice(0,10));
              setTo(end.toISOString().slice(0,10));
              setPage(1);
            }}>Tahun ini</Button>
            <Button variant="outline" onClick={()=>{
              setQ(""); setType(""); setAccount(""); setCategory(""); setFrom(""); setTo(""); setSort("date_desc"); setPage(1);
            }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="hidden md:block">
        <CardHeader className="pb-2"><CardTitle className="text-base">Daftar Transaksi</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Separator />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(t => (
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.occurredAt).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{t.categoryName ?? (t.type==="income" ? "Pemasukan" : "Pengeluaran")}</TableCell>
                  <TableCell>{t.accountName}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{t.notes}</TableCell>
                  <TableCell className={`text-right font-semibold ${t.type==="income"?"text-emerald-600":"text-red-600"}`}>
                    {t.type==="income" ? "+" : "-"} {rupiah(t.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* TODO: panggil modal edit */}
                      <Button variant="outline" size="icon" aria-label="Edit">
                        <EditTransactionModal id={t.id} trigger={<Pencil className="h-4 w-4" />} />
                      </Button>
                      <Button variant="destructive" size="icon" aria-label="Hapus" onClick={()=> delMut.mutate({ id: t.id })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile list */}
      <div className="md:hidden space-y-3">
        {items.map(t => (
          <Card key={t.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.categoryName ?? (t.type==="income" ? "Pemasukan" : "Pengeluaran")}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {new Date(t.occurredAt).toLocaleString("id-ID")} • {t.accountName}{t.notes ? ` • ${t.notes}` : ""}
                  </div>
                </div>
                <div className={`shrink-0 text-sm font-semibold ${t.type==="income"?"text-emerald-600":"text-red-600"}`}>
                  {t.type==="income" ? "+" : "-"} {rupiah(t.amount)}
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
                <Button variant="destructive" size="sm" onClick={()=> delMut.mutate({ id: t.id })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground text-center">Tidak ada data.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Total {total} data</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page<=1} onClick={()=> setPage(p=>p-1)}>Sebelumnya</Button>
          <Button variant="outline" size="sm" disabled={page>=pages} onClick={()=> setPage(p=>p+1)}>Berikutnya</Button>
        </div>
      </div>

      {/* FAB Mobile */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <AddTransactionModal  
          accounts={accounts?.items ?? []}
          categories={categories?.items ?? []}
          userId=""
        />
        <Button className="h-12 w-12 rounded-full shadow-lg" aria-label="Tambah transaksi">
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function rupiah(n: string | number) {
  const v = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);
}
