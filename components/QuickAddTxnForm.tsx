"use client";

import { useState } from "react";
import { useTransition } from "react";
import { createTransaction } from "@/app/(dashboard)/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useApiQuery, api } from "@/lib/react-query";
import { toast } from "sonner";

export default function QuickAddTxnForm() {
  const { data: accs } = useApiQuery<{items:{id:string; name:string}[]}>(
    ["acc-filter"], () => api.get("/api/accounts"), { staleTime: 60_000 }
  );
  const { data: cats } = useApiQuery<{items:{id:string; name:string; kind:"income"|"expense"}[]}>(
    ["cat-filter"], () => api.get("/api/categories"), { staleTime: 60_000 }
  );

  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    occurredAt: new Date().toISOString().slice(0,16),
    amount: "",
    type: "expense",
    accountId: "",
    categoryId: "",
    notes: ""
  });

  return (
    <form action={(fd: FormData) => {
      startTransition(async () => {
        const res = await createTransaction(fd);
        if (res.ok) toast.success("Transaksi ditambahkan");
        else toast.error(`Gagal: ${res.error || "unknown"}`);
      });
    }} className="grid gap-2 md:grid-cols-6">
      <Input type="datetime-local" name="occurredAt" value={form.occurredAt} onChange={e=>setForm(f=>({...f, occurredAt:e.target.value}))} className="md:col-span-2" />
      <Input name="amount" placeholder="Nominal" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
      <Select value={form.type} onValueChange={(v: "income" | "expense")=> setForm(f=>({...f, type:v}))}>
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
      <Select value={form.categoryId} onValueChange={(v)=> setForm(f=>({...f, categoryId:v}))}>
        <SelectTrigger><SelectValue placeholder="Kategori (opsional)" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">(Tanpa kategori)</SelectItem>
          {(cats?.items ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input name="notes" placeholder="Catatan (opsional)" value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} />
      {/* hidden fields sinkron ke server action */}
      <input type="hidden" name="type" value={form.type} />
      <input type="hidden" name="accountId" value={form.accountId} />
      <input type="hidden" name="categoryId" value={form.categoryId || ""} />
      <Button type="submit" disabled={isPending} className="md:col-span-6 justify-self-end">Simpan</Button>
    </form>
  );
}
