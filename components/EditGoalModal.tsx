"use client";

import { useState } from "react";
import { useApiMutation, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function EditGoalModal({
  id, initial, onSaved, children
}:{
  id: string;
  initial: { name:string; target:number; targetDate?:string|null; color?:string|null; icon?:string|null; saved:number; remaining:number; };
  onSaved?: ()=>void;
  children: React.ReactNode;
}){
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: initial.name,
    targetAmount: String(initial.target),
    targetDate: initial.targetDate ? initial.targetDate.slice(0,10) : "",
    color: initial.color || "#3b82f6",
    icon: initial.icon || "LuTarget",
  });

  const mut = useApiMutation<{ok:true}, { name: string; targetAmount: number; targetDate?: string; color?: string; icon?: string }>(
    (payload)=> api.patch(`/api/goals/${id}`, payload),
    { toastSuccess:"Goal diperbarui", onSuccess: ()=> { setOpen(false); onSaved?.(); } }
  );

  return (
    <Dialog open={open} onOpenChange={(v)=> { setOpen(v); if(v){ setForm({
      name: initial.name, targetAmount: String(initial.target), targetDate: initial.targetDate ? initial.targetDate.slice(0,10) : "", color: initial.color || "#3b82f6", icon: initial.icon || "LuTarget"
    }); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
        <form
          onSubmit={(e)=>{ e.preventDefault();
            if(!form.name || !form.targetAmount) return toast.error("Nama & target wajib diisi");
            mut.mutate({
              name: form.name,
              targetAmount: Number(form.targetAmount),
              targetDate: form.targetDate || undefined,
              color: form.color,
              icon: form.icon,
            });
          }}
          className="grid gap-3"
        >
          <Input placeholder="Nama goal" value={form.name} onChange={e=> setForm(f=>({...f, name:e.target.value}))} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Target (angka)" value={form.targetAmount} onChange={e=> setForm(f=>({...f, targetAmount:e.target.value}))} />
            <Input type="date" value={form.targetDate} onChange={e=> setForm(f=>({...f, targetDate:e.target.value}))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input type="color" className="h-9 w-12 rounded border" value={form.color} onChange={e=> setForm(f=>({...f, color:e.target.value}))} />
              <Input value={form.color} onChange={e=> setForm(f=>({...f, color:e.target.value}))} />
            </div>
            <Input placeholder="Icon (cth: LuTarget)" value={form.icon} onChange={e=> setForm(f=>({...f, icon:e.target.value}))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=> setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={mut.isPending}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
