"use client";

import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import AddAccountModal from "@/components/AddAccountModal";
import EditAccountModal from "@/components/EditAccountModal";

type Row = {
  id: string; name: string; type: "cash"|"bank"|"ewallet"|"investment";
  currency: string; balance: string; note: string|null; createdAt: string;
};
type ListRes = { items: Row[]; page: number; limit: number; total: number };

export default function AccountsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data } = useApiQuery<ListRes>(
    ["accounts", { q, page, limit }],
    () => api.get("/api/accounts?" + new URLSearchParams({ q, page: String(page), limit: String(limit) })),
    { placeholderData: keepPreviousData }
  );

  const delMut = useApiMutation<{ok:true}, {id:string}>(
    ({ id }) => api.del(`/api/accounts/${id}`),
    { onSuccess: () => toast.success("Akun dihapus") }
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const totalSaldo = useMemo(() => items.reduce((s,a)=> s + Number(a.balance||0), 0), [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Akun</h1>
          <p className="text-sm text-muted-foreground">Total saldo: {rupiah(totalSaldo)}</p>
        </div>
        <div className="hidden md:block">
          <AddAccountModal />
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Input placeholder="Cari nama akun…" value={q} onChange={(e)=>{ setQ(e.target.value); setPage(1); }} className="w-64" />
          <Button variant="outline" onClick={()=>{ setQ(""); setPage(1); }}>Reset</Button>
        </CardContent>
      </Card>

      {/* Tabel desktop */}
      <Card className="hidden md:block">
        <CardHeader className="pb-2"><CardTitle className="text-base">Daftar Akun</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Separator />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Mata Uang</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="capitalize">{labelType(a.type)}</TableCell>
                  <TableCell>{a.currency}</TableCell>
                  <TableCell className="text-right font-semibold">{rupiah(a.balance)}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{a.note}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditAccountModal id={a.id} initial={{
                        name: a.name, type: a.type, currency: a.currency, balance: Number(a.balance||0), note: a.note ?? ""
                      }}>
                        <Button variant="outline" size="icon" aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      </EditAccountModal>
                      <Button variant="destructive" size="icon" aria-label="Hapus" onClick={()=> delMut.mutate({ id: a.id })}><Trash2 className="h-4 w-4" /></Button>
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

      {/* Kartu mobile */}
      <div className="md:hidden space-y-3">
        {items.map(a => (
          <Card key={a.id}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{labelType(a.type)} • {a.currency}</div>
                </div>
                <div className="shrink-0 text-sm font-semibold">{rupiah(a.balance)}</div>
              </div>
              {a.note && <div className="mt-1 text-xs text-muted-foreground truncate">{a.note}</div>}
              <div className="mt-2 flex justify-end gap-2">
                <EditAccountModal id={a.id} initial={{
                  name: a.name, type: a.type, currency: a.currency, balance: Number(a.balance||0), note: a.note ?? ""
                }}>
                  <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
                </EditAccountModal>
                <Button variant="destructive" size="sm" onClick={()=> delMut.mutate({ id: a.id })}><Trash2 className="h-4 w-4" /></Button>
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

      {/* FAB tambah akun (mobile) */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <AddAccountModal asChild>
          <Button className="h-12 w-12 rounded-full shadow-lg" aria-label="Tambah akun">
            <Plus className="h-5 w-5" />
          </Button>
        </AddAccountModal>
      </div>
    </div>
  );
}

function rupiah(n: string | number){
  const v = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(v||0);
}
function labelType(t: Row["type"]){
  switch(t){
    case "cash": return "Tunai";
    case "bank": return "Rekening Bank";
    case "ewallet": return "E-Wallet";
    case "investment": return "Investasi";
  }
}
