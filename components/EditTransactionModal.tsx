"use client";

import { useState } from "react";
import { useApiMutation, api, useApiQuery } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

type Props = {
  id: string;
  trigger?: React.ReactNode; // tombol pembuka
};

type TransactionResponse = {
  items: {
    id: string;
    occurredAt: string;
    amount: number;
    type: "income" | "expense";
    accountId: string;
    categoryId: string | null;
    notes: string | null;
  }[];
};

export default function EditTransactionModal({ id, trigger }: Props) {
  const [open, setOpen] = useState(false);

  // ambil data transaksi satuan
  const { data: trx, isLoading } = useApiQuery<TransactionResponse>(
    ["transaction", id],
    () => api.get(`/api/transactions?` + new URLSearchParams({ page:"1", limit:"1", q:"", sort:"date_desc", })),
    { enabled: open } // contoh sederhana: reuse list, bisa ganti ke endpoint /api/transactions/[id]
  );

  // sumber dropdown
  const { data: accs } = useApiQuery<{items:{id:string; name:string}[]}>(
    ["acc-filter"], () => api.get("/api/accounts"), { staleTime: 60_000 }
  );
  const { data: cats } = useApiQuery<{items:{id:string; name:string; kind:"income"|"expense"}[]}>(
    ["cat-filter"], () => api.get("/api/categories"), { staleTime: 60_000 }
  );

  // mutation PATCH
  const patch = useApiMutation<{ok:true}, {
    occurredAt: string;
    amount: number;
    type: "income" | "expense";
    accountId: string;
    categoryId: string | null;
    notes: string | null;
  }>(
    (payload) => api.patch(`/api/transactions/${id}`, payload),
    { toastSuccess: "Transaksi diperbarui", onSuccess: () => setOpen(false) }
  );

  // state sementara (prefill saat dialog dibuka pertama kali)
  const t = (trx?.items ?? []).find((x)=> x.id === id);
  const [form, setForm] = useState<{
    occurredAt?: string;
    amount?: string;
    type?: "income"|"expense";
    accountId?: string;
    categoryId?: string|null;
    notes?: string|null;
  }>({});

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (v && t) {
      setForm({
        occurredAt: t.occurredAt ? new Date(t.occurredAt).toISOString().slice(0,16) : undefined,
        amount: t.amount.toString(),
        type: t.type,
        accountId: t.accountId,
        categoryId: t.categoryId,
        notes: t.notes,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline" size="sm">Edit</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Transaksi</DialogTitle></DialogHeader>

        {isLoading && <div className="text-sm text-muted-foreground">Memuat…</div>}
        {!isLoading && (
          <form
            onSubmit={(e)=> {
              e.preventDefault();
              if (!form.amount || !form.occurredAt || !form.type || !form.accountId) {
                toast.error("Lengkapi data wajib");
                return;
              }
              patch.mutate({
                occurredAt: new Date(form.occurredAt).toISOString(),
                amount: Number(form.amount),
                type: form.type,
                accountId: form.accountId,
                categoryId: form.categoryId ?? null,
                notes: form.notes ?? null,
              });
            }}
            className="grid gap-3"
          >
            <Input type="datetime-local" value={form.occurredAt || ""} onChange={e=>setForm(f=>({...f, occurredAt:e.target.value}))} />
            <Input placeholder="Nominal" value={form.amount || ""} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
            <Select value={form.type} onValueChange={(v:"income"|"expense")=> setForm(f=>({...f, type:v}))}>
              <SelectTrigger><SelectValue placeholder="Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="expense">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.accountId} onValueChange={(v)=> setForm(f=>({...f, accountId:v}))}>
              <SelectTrigger><SelectValue placeholder="Akun" /></SelectTrigger>
              <SelectContent>
                {(accs?.items ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.categoryId ?? ""} onValueChange={(v)=> setForm(f=>({...f, categoryId: v || null}))}>
              <SelectTrigger><SelectValue placeholder="Kategori (opsional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">(Tanpa kategori)</SelectItem>
                {(cats?.items ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Catatan (opsional)" value={form.notes || ""} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} />
            <div className="flex justify-end gap-2 mt-1">
              <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={patch.isPending}>Simpan</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
