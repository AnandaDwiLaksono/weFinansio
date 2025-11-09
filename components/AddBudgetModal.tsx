"use client";

import { useState } from "react";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function AddBudgetModal({
  defaultPeriod,
  onSaved,
  className,
}: { defaultPeriod: string; onSaved?: ()=>void; className?: string }){
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ period: defaultPeriod, categoryId: "", limitAmount: "", carryover: false });

  const { data: cats } = useApiQuery<{items:{id:string; name:string; kind:"income"|"expense"}[]}>(
    ["cats-budget"], () => api.get("/api/categories?limit=200&page=1"), { staleTime: 60_000 }
  );

  const mut = useApiMutation<{id:string}, {categoryId: string; period: string; limitAmount: number; carryover: boolean}>(
    (payload)=> api.post("/api/budgets", payload),
    { toastSuccess: "Budget dibuat", onSuccess: ()=> { setOpen(false); onSaved?.(); } }
  );

  return (
    <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if(v) setForm({ period: defaultPeriod, categoryId:"", limitAmount:"", carryover:false }); }}>
      <DialogTrigger asChild>
        <Button size="sm" className={className}><Plus className="h-4 w-4 mr-2" />Tambah Budget</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tambah Budget</DialogTitle></DialogHeader>
        <form
          onSubmit={(e)=>{ e.preventDefault();
            if(!form.categoryId || !form.limitAmount) return toast.error("Lengkapi kategori & nominal");
            mut.mutate({ categoryId: form.categoryId, period: form.period, limitAmount: Number(form.limitAmount), carryover: form.carryover });
          }}
          className="grid gap-3"
        >
          <Input type="month" value={form.period} onChange={e=> setForm(f=>({...f, period: e.target.value}))} />
          <Select value={form.categoryId} onValueChange={(v)=> setForm(f=>({...f, categoryId: v}))}>
            <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
            <SelectContent>
              {(cats?.items ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.kind})</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Limit (angka)" value={form.limitAmount} onChange={e=> setForm(f=>({...f, limitAmount: e.target.value}))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.carryover} onChange={e=> setForm(f=>({...f, carryover: e.target.checked}))} />
            Sisa bulan lalu dibawa ke bulan ini
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=> setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={mut.isPending}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
