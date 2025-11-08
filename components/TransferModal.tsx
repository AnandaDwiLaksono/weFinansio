"use client";

import { useState } from "react";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Shuffle } from "lucide-react";

export default function TransferModal({ asChild=false, children }:{ asChild?: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ from:"", to:"", amount:"", occurredAt: new Date().toISOString().slice(0,16), note:"" });

  const { data: accs } = useApiQuery<{items:{id:string; name:string}[]}>(
    ["acc-filter"], () => api.get("/api/accounts"), { staleTime: 60_000 }
  );

  const mut = useApiMutation<{ok:true},{fromAccountId:string;toAccountId:string;amount:number;occurredAt:string;note?:string}>(
    (payload) => api.post("/api/accounts/transfer", payload),
    { toastSuccess: "Transfer berhasil", onSuccess: ()=> setOpen(false) }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={asChild}>
        {children ?? <Button size="sm" variant="outline"><Shuffle className="h-4 w-4 mr-2" />Transfer</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Transfer antar Akun</DialogTitle></DialogHeader>
        <form
          onSubmit={(e)=>{ e.preventDefault();
            if (!form.from || !form.to || !form.amount) return toast.error("Lengkapi data.");
            mut.mutate({
              fromAccountId: form.from,
              toAccountId: form.to,
              amount: Number(form.amount),
              occurredAt: new Date(form.occurredAt).toISOString(),
              note: form.note || undefined,
            });
          }}
          className="grid gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.from} onValueChange={(v)=> setForm(f=>({...f, from:v}))}>
              <SelectTrigger><SelectValue placeholder="Dari akun" /></SelectTrigger>
              <SelectContent>
                {(accs?.items ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.to} onValueChange={(v)=> setForm(f=>({...f, to:v}))}>
              <SelectTrigger><SelectValue placeholder="Ke akun" /></SelectTrigger>
              <SelectContent>
                {(accs?.items ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Nominal" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
          <Input type="datetime-local" value={form.occurredAt} onChange={e=>setForm(f=>({...f, occurredAt:e.target.value}))} />
          <Input placeholder="Catatan (opsional)" value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={mut.isPending}>Transfer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
