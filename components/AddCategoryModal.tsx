"use client";

import { useState } from "react";
import { useApiMutation, api, useApiQuery } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import QuickAddCategory from "./QuickAddCategory";
import { categories } from "@/lib/db/schema";

export default function AddCategoryModal({ asChild=false, children }:{ asChild?:boolean; children?:React.ReactNode }){
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name:"", kind:"expense", color:"#3b82f6", icon:"LuWallet", categoryId: null as string | null });
  const [showQuickCat, setShowQuickCat] = useState(false);
  
  const { data: catsAll } = useApiQuery<{items:{id:string; name:string; kind:"income"|"expense"}[]}>(
    ["cats-all"], () => api.get("/api/categories?limit=100&page=1"),
    { staleTime: 60_000 }
  );

  const create = useApiMutation<{id:string}, {name: string; kind: string; color: string; icon: string}>(
    (payload)=> api.post("/api/categories", payload),
    { toastSuccess:"Kategori dibuat", onSuccess:()=> setOpen(false) }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={asChild}>
        {children ?? <Button size="sm"><Plus className="h-4 w-4 mr-2" />Tambah Kategori</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tambah Kategori</DialogTitle></DialogHeader>
        <form
          onSubmit={(e)=>{
            e.preventDefault();
            if(!form.name) return toast.error("Nama wajib diisi");
            const exists = (catsAll?.items ?? []).some(
              c => c.kind === form.kind && c.name.trim().toLowerCase() === form.name.trim().toLowerCase()
            );
            if (exists) return toast.error("Kategori dengan nama & tipe ini sudah ada.");
            create.mutate({ ...form, color: form.color });
          }}
          className="grid gap-3"
        >
          <Input placeholder="Nama kategori" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
          <Select value={form.kind} onValueChange={(v: "income" | "expense")=> setForm(f=>({...f, kind:v}))}>
            <SelectTrigger>
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Pemasukan</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm">Kategori</label>
              <button type="button" className="text-xs underline" onClick={()=> setShowQuickCat(v=>!v)}>
                {showQuickCat ? "Tutup tambah kategori" : "+ Kategori"}
              </button>
            </div>

            <Select value={form.categoryId ?? ""} onValueChange={(v)=> setForm(f=>({ ...f, categoryId: v || null }))}>
              <SelectTrigger><SelectValue placeholder="Pilih kategori (opsional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">(Tanpa kategori)</SelectItem>
                {(catsAll?.items ?? []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showQuickCat && (
              <QuickAddCategory
                defaultKind={form.kind as "income" | "expense"} // sinkron tipe transaksi
                onCreated={(nc) => {
                  // refresh list kategori cepat (opsional: invalidate ["cat-filter"] kalau pakai react-query)
                  // lalu set terpilih
                  setForm(f => ({ ...f, categoryId: nc.id }));
                }}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input type="color" className="h-9 w-12 rounded border" value={form.color} onChange={e=>setForm(f=>({...f, color:e.target.value}))} />
              <Input value={form.color} onChange={e=>setForm(f=>({...f, color:e.target.value}))} />
            </div>
            <Input placeholder="Icon (mis. LuUtensils)" value={form.icon} onChange={e=>setForm(f=>({...f, icon:e.target.value}))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={create.isPending}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
