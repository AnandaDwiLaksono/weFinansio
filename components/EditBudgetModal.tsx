"use client";

import { useState } from "react";
import { useApiMutation, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function EditBudgetModal({
  id, initial, onSaved, children
}: {
  id: string;
  initial: { limitAmount: number; carryover: boolean };
  onSaved?: ()=>void;
  children: React.ReactNode;
}){
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...initial, limitAmount: String(initial.limitAmount) });

  const mut = useApiMutation<{ok:true}, { limitAmount: number; carryover: boolean }>(
    (payload)=> api.patch(`/api/budgets/${id}`, payload),
    { toastSuccess: "Budget diperbarui", onSuccess: ()=> { setOpen(false); onSaved?.(); } }
  );

  return (
    <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if(v) setForm({ ...initial, limitAmount: String(initial.limitAmount) }); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Budget</DialogTitle></DialogHeader>
        <form
          onSubmit={(e)=>{ e.preventDefault();
            mut.mutate({ limitAmount: Number(form.limitAmount||0), carryover: form.carryover });
          }}
          className="grid gap-3"
        >
          <Input placeholder="Limit (angka)" value={form.limitAmount} onChange={e=> setForm(f=>({...f, limitAmount: e.target.value}))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.carryover} onChange={e=> setForm(f=>({...f, carryover: e.target.checked}))} />
            Carryover aktif
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
