"use client";

import { useState } from "react";
import { useApiMutation, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";

export default function EditAccountModal({
  id,
  initial,
  children,
}: {
  id: string;
  initial: { name: string; type: "cash"|"bank"|"ewallet"|"investment"; currency: string; balance: number; note: string };
  children: React.ReactNode;
}){
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...initial, balance: String(initial.balance ?? 0) });

  const patch = useApiMutation<{ok:true}, { name: string; type: string; currency: string; balance: number; note: string | null }>(
    (payload) => api.patch(`/api/accounts/${id}`, payload),
    { toastSuccess: "Akun diperbarui", onSuccess: ()=> setOpen(false) }
  );

  return (
    <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if(v) setForm({ ...initial, balance: String(initial.balance??0) }); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Akun</DialogTitle></DialogHeader>
        <form
          onSubmit={(e)=>{ e.preventDefault();
            if(!form.name) return toast.error("Nama wajib diisi");
            patch.mutate({
              name: form.name,
              type: form.type,
              currency: form.currency,
              balance: Number(form.balance || 0),
              note: form.note || null,
            });
          }}
          className="grid gap-3"
        >
          <Input placeholder="Nama akun" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
          <Select value={form.type} onValueChange={(v)=> setForm(f=>({...f, type:v as "cash"|"bank"|"ewallet"|"investment"}))}>
            <SelectTrigger><SelectValue placeholder="Jenis akun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Tunai</SelectItem>
              <SelectItem value="bank">Rekening Bank</SelectItem>
              <SelectItem value="ewallet">E-Wallet</SelectItem>
              <SelectItem value="investment">Investasi</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Mata uang" value={form.currency} onChange={e=>setForm(f=>({...f, currency:e.target.value.toUpperCase()}))} />
            <Input placeholder="Saldo" value={form.balance} onChange={e=>setForm(f=>({...f, balance:e.target.value}))} />
          </div>
          <Input placeholder="Catatan (opsional)" value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={patch.isPending}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
