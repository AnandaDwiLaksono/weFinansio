"use client";

import { useState } from "react";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { keepPreviousData } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import AddCategoryModal from "@/components/AddCategoryModal";
import EditCategoryModal from "@/components/EditCategoryModal";

type Row = { id: string; name: string; kind: "income"|"expense"; color: string; icon: string; usage: number; createdAt: string };
type ListRes = { items: Row[]; page: number; limit: number; total: number };

export default function CategoriesPage(){
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<""|"income"|"expense">("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data } = useApiQuery<ListRes>(
    ["categories", { q, kind, page, limit }],
    () => api.get("/api/categories?" + new URLSearchParams({ q, kind, page:String(page), limit:String(limit) })),
    { placeholderData: keepPreviousData }
  );

  const delMut = useApiMutation<{ok:true},{id:string}>(
    ({ id }) => api.del(`/api/categories/${id}`),
    { onSuccess: ()=> toast.success("Kategori dihapus") }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kategori</h1>
          <p className="text-sm text-muted-foreground">Kelola kategori pemasukan & pengeluaran</p>
        </div>
        <div className="hidden md:block"><AddCategoryModal /></div>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-6">
          <Input placeholder="Cari nama…" value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} className="md:col-span-2" />
          <Select value={kind} onValueChange={(v:""|"income"|"expense")=>{ setKind(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Semua tipe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
          <div className="md:col-span-3 flex gap-2">
            <Button variant="outline" onClick={()=>{ setQ(""); setKind(""); setPage(1); }}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardHeader className="pb-2"><CardTitle className="text-base">Daftar Kategori</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Separator />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Warna</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead className="text-right">Dipakai</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="capitalize">{c.kind === "income" ? "Pemasukan" : "Pengeluaran"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-4 w-4 rounded" style={{ background: c.color }} />
                      <code className="text-xs">{c.color}</code>
                    </div>
                  </TableCell>
                  <TableCell><code className="text-xs">{c.icon}</code></TableCell>
                  <TableCell className="text-right">{c.usage}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditCategoryModal id={c.id} initial={c}>
                        <Button variant="outline" size="icon" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      </EditCategoryModal>
                      <Button variant="destructive" size="icon" aria-label="Hapus" disabled={c.usage>0} onClick={()=> delMut.mutate({ id: c.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length===0 && (
                <TableRow><TableCell colSpan={6} className="p-6 text-sm text-muted-foreground text-center">Tidak ada data.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map(c => (
          <Card key={c.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.kind==="income"?"Pemasukan":"Pengeluaran"} • <code>{c.icon}</code></div>
                </div>
                <span className="inline-block h-4 w-4 rounded" style={{ background: c.color }} />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <EditCategoryModal id={c.id} initial={c}>
                  <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
                </EditCategoryModal>
                <Button variant="destructive" size="sm" disabled={c.usage>0} onClick={()=> delMut.mutate({ id: c.id })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length===0 && <div className="text-sm text-muted-foreground text-center">Tidak ada data.</div>}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Total {total} data</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page<=1} onClick={()=> setPage(p=>p-1)}>Sebelumnya</Button>
          <Button variant="outline" size="sm" disabled={page>=pages} onClick={()=> setPage(p=>p+1)}>Berikutnya</Button>
        </div>
      </div>

      {/* FAB tambah (mobile) */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <AddCategoryModal asChild>
          <Button className="h-12 w-12 rounded-full shadow-lg" aria-label="Tambah kategori">
            <Plus className="h-5 w-5" />
          </Button>
        </AddCategoryModal>
      </div>
    </div>
  );
}
