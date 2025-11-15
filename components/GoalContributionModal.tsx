"use client";

import { useState } from "react";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type EntryRow = { id:string; occurredAt:string; amount:string; note:string|null };

export default function GoalContributionModal({
  goalId, onSaved, children
}: { goalId: string; onSaved?: ()=>void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    occurredAt: new Date().toISOString().slice(0,16),
    note: "",
    mirrorTransaction: true,
    accountId: "",
    categoryId: "",
  });

  // akun & kategori untuk mirror
  const { data: accs } = useApiQuery<{items:{id:string; name:string}[]}>(
    ["acc-for-goal"], () => api.get("/api/accounts"), { staleTime: 60_000 }
  );
  const { data: cats } = useApiQuery<{items:{id:string; name:string; kind:"income"|"expense"}[]}>(
    ["cats-for-goal"], () => api.get("/api/categories?limit=200&page=1"), { staleTime: 60_000 }
  );

  // riwayat kontribusi goal
  const { data: history, refetch } = useApiQuery<{items:EntryRow[]}>(
    ["goal-entries", goalId],
    () => api.get(`/api/goals/${goalId}/entries`),
    { enabled: open }
  );

  const mut = useApiMutation<{ok:true}, {
    amount: number;
    occurredAt: string;
    note?: string;
    mirrorTransaction: boolean;
    accountId?: string;
    categoryId?: string;
  }>(
    (payload)=> api.post(`/api/goals/${goalId}/entries`, payload),
    {
      toastSuccess:"Tersimpan",
      onSuccess: ()=> {
        onSaved?.();
        refetch();
        // reset form nominal saja, tanggal tetap
        setForm(f => ({ ...f, amount:"", note:"" }));
      }
    }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount) return toast.error("Nominal wajib diisi");
    const num = Number(form.amount);
    if (!num || Number.isNaN(num)) return toast.error("Nominal tidak valid");

    if (form.mirrorTransaction && !form.accountId) {
      return toast.error("Pilih akun untuk transaksi.");
    }

    mut.mutate({
      amount: num,
      occurredAt: new Date(form.occurredAt).toISOString(),
      note: form.note || undefined,
      mirrorTransaction: form.mirrorTransaction,
      accountId: form.accountId || undefined,
      categoryId: form.categoryId || undefined,
    });
  }

  function resetState() {
    setForm({
      amount: "",
      occurredAt: new Date().toISOString().slice(0,16),
      note: "",
      mirrorTransaction: true,
      accountId: "",
      categoryId: "",
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v)=> {
        setOpen(v);
        if (v) {
          resetState();
          refetch();
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Kontribusi</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <Input
            placeholder="Nominal (positif = deposit, negatif = tarik)"
            value={form.amount}
            onChange={e=> setForm(f=>({ ...f, amount: e.target.value }))}
          />
          <Input
            type="datetime-local"
            value={form.occurredAt}
            onChange={e=> setForm(f=>({ ...f, occurredAt: e.target.value }))}
          />
          <Input
            placeholder="Catatan (opsional)"
            value={form.note}
            onChange={e=> setForm(f=>({ ...f, note: e.target.value }))}
          />

          {/* Mirror ke transaksi */}
          <div className="mt-1 rounded border p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.mirrorTransaction}
                onChange={e=> setForm(f=>({ ...f, mirrorTransaction: e.target.checked }))}
              />
              <span>Catat juga sebagai transaksi</span>
            </label>

            {form.mirrorTransaction && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Select
                  value={form.accountId}
                  onValueChange={(v)=> setForm(f=>({ ...f, accountId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accs?.items ?? []).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={form.categoryId}
                  onValueChange={(v)=> setForm(f=>({ ...f, categoryId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">(Tanpa kategori)</SelectItem>
                    {(cats?.items ?? []).map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.kind === "income" ? "Pemasukan" : "Pengeluaran"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="outline" onClick={()=> setOpen(false)}>Tutup</Button>
            <Button type="submit" disabled={mut.isPending}>Simpan</Button>
          </div>
        </form>

        {/* Riwayat kontribusi */}
        <div className="mt-4 border-t pt-3 flex-1 min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Riwayat kontribusi</div>
            <Button variant="outline" size="sm" onClick={()=> refetch()}>Refresh</Button>
          </div>
          <div className="max-h-52 overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history?.items ?? []).map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(e.occurredAt).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className={`text-right text-xs font-semibold ${Number(e.amount) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {rupiah(Number(e.amount))}
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">
                      {e.note}
                    </TableCell>
                  </TableRow>
                ))}
                {(!history?.items || history.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-xs text-muted-foreground text-center py-4">
                      Belum ada kontribusi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function rupiah(n:number){
  return new Intl.NumberFormat("id-ID",{
    style:"currency", currency:"IDR", maximumFractionDigits:0
  }).format(n || 0);
}
