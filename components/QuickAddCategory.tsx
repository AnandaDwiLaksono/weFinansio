"use client";

import { useState } from "react";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function QuickAddCategory({
  defaultKind = "expense",
  onCreated,
}: {
  defaultKind?: "income" | "expense";
  onCreated?: (newCat: { id: string; name: string }) => void;
}) {
  const [form, setForm] = useState({ name: "", kind: defaultKind, color: "#3b82f6", icon: "LuWallet" });

  const { data: catsAll } = useApiQuery<{items:{id:string; name:string; kind:"income"|"expense"}[]}>(
    ["cats-all"], () => api.get("/api/categories?limit=200&page=1"), { staleTime: 60_000 }
  );

  const create = useApiMutation<{id:string}, typeof form>(
    (payload) => api.post("/api/categories", payload),
    {
      toastSuccess: "Kategori dibuat",
      onSuccess: (res) => {
        onCreated?.({ id: res.id, name: form.name });
        setForm({ name: "", kind: defaultKind, color: "#3b82f6", icon: "LuWallet" });
      }
    }
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return toast.error("Nama wajib diisi");
    const exists = (catsAll?.items ?? []).some(
      c => c.kind === form.kind && c.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (exists) return toast.error("Kategori dengan nama & tipe ini sudah ada.");
    create.mutate(form);
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded border p-3">
      <div className="text-xs font-medium">Tambah kategori cepat</div>
      <Input placeholder="Nama kategori" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
      <div className="grid grid-cols-2 gap-2">
        <Select value={form.kind} onValueChange={(v:"income"|"expense")=> setForm(f=>({...f, kind:v}))}>
          <SelectTrigger><SelectValue placeholder="Tipe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Pemasukan</SelectItem>
            <SelectItem value="expense">Pengeluaran</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <input type="color" className="h-9 w-12 rounded border" value={form.color} onChange={e=>setForm(f=>({...f, color:e.target.value}))} />
          <Input value={form.color} onChange={e=>setForm(f=>({...f, color:e.target.value}))} />
        </div>
      </div>
      <Input placeholder="Icon (cth: LuUtensils)" value={form.icon} onChange={e=>setForm(f=>({...f, icon:e.target.value}))} />
      <div className="flex justify-end">
        <Button type="submit" size="sm">Simpan</Button>
      </div>
    </form>
  );
}
