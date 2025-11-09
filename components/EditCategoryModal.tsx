"use client";

import { useState } from "react";
import { useApiMutation, api, useApiQuery } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

export default function EditCategoryModal({
  id, initial, children,
}: {
  id: string;
  initial: { id: string; name: string; kind: "income"|"expense"; color: string; icon: string; usage?: number };
  children: React.ReactNode;
}){
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...initial });

  const { data: catsAll } = useApiQuery<{items:{id:string; name:string; kind:"income"|"expense"}[]}>(
    ["cats-all"], () => api.get("/api/categories?limit=100&page=1"),
    { staleTime: 60_000 }
  );

  const patch = useApiMutation<{ok:true}, { name: string; kind: "income"|"expense"; color: string; icon: string }>(
    (payload)=> api.patch(`/api/categories/${id}`, payload),
    { toastSuccess: "Kategori diperbarui", onSuccess:()=> setOpen(false) }
  );

  return (
    <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if(v) setForm({...initial}); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Kategori</DialogTitle></DialogHeader>
        <form
          onSubmit={(e)=>{ e.preventDefault();
            if(!form.name) return toast.error("Nama wajib diisi");
            const exists = (catsAll?.items ?? []).some(
              c => c.kind === form.kind && c.name.trim().toLowerCase() === form.name.trim().toLowerCase() && c.id !== id
            );
            if (exists) return toast.error("Kategori dengan nama & tipe ini sudah ada.");
            patch.mutate({
              name: form.name,
              kind: form.kind,
              color: form.color,
              icon: form.icon,
            });
          }}
          className="grid gap-3"
        >
          <Input placeholder="Nama kategori" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
          <Select value={form.kind} onValueChange={(v:"income"|"expense")=> setForm(f=>({...f, kind:v}))}>
            <SelectTrigger><SelectValue placeholder="Tipe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Pemasukan</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input type="color" className="h-9 w-12 rounded border" value={form.color} onChange={e=>setForm(f=>({...f, color:e.target.value}))} />
              <Input value={form.color} onChange={e=>setForm(f=>({...f, color:e.target.value}))} />
            </div>
            <Input placeholder="Icon (mis. LuUtensils)" value={form.icon} onChange={e=>setForm(f=>({...f, icon:e.target.value}))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={patch.isPending}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
