"use client";

import { useState, useEffect } from "react";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Shuffle } from "lucide-react";

type LinkedGoal = { id: string; name: string; color?: string | null; icon?: string | null };

export default function TransferModal({ asChild=false, children }:{ asChild?: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ from:"", to:"", amount:"", occurredAt: new Date().toISOString().slice(0,16), note:"" });
  const [splitMode, setSplitMode] = useState<"equal"|"manual">("equal");
  const [manualSplits, setManualSplits] = useState<Record<string, string>>({});

  const { data: accs } = useApiQuery<{items:{id:string; name:string}[]}>(
    ["acc-filter"], () => api.get("/api/accounts"), { staleTime: 60_000 }
  );

  const { data: linkedGoalsData, refetch: refetchLinkedGoals } = useApiQuery<{items: LinkedGoal[]}>(
    ["linked-goals", form.to],
    () => api.get(`/api/accounts/${form.to}/linked-goals`),
    { enabled: !!form.to && open, staleTime: 30_000 }
  );

  const linkedGoals = linkedGoalsData?.items ?? [];
  const hasMultipleGoals = linkedGoals.length > 1;

  // Reset splits when goals change or amount changes
  useEffect(() => {
    if (linkedGoals.length > 0 && form.amount) {
      const equalAmount = (Number(form.amount) / linkedGoals.length).toFixed(2);
      const newSplits: Record<string, string> = {};
      linkedGoals.forEach(g => {
        newSplits[g.id] = splitMode === "equal" ? equalAmount : (manualSplits[g.id] || "0");
      });
      setManualSplits(newSplits);
    }
  }, [linkedGoals.length, form.amount, splitMode]);

  const mut = useApiMutation<
    {ok:true; transferGroupId: string; linkedGoalsCount: number},
    {fromAccountId:string; toAccountId:string; amount:number; occurredAt:string; note?:string; goalContributions?: Array<{goalId: string; amount: number}>}
  >(
    (payload) => api.post("/api/accounts/transfer", payload),
    { toastSuccess: "Transfer berhasil", onSuccess: ()=> { setOpen(false); setForm({ from:"", to:"", amount:"", occurredAt: new Date().toISOString().slice(0,16), note:"" }); setSplitMode("equal"); setManualSplits({}); } }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from || !form.to || !form.amount) return toast.error("Lengkapi data.");
    
    const transferAmount = Number(form.amount);
    let goalContributions: Array<{goalId: string; amount: number}> | undefined;

    if (hasMultipleGoals && splitMode === "manual") {
      // Validate manual splits
      const splits = Object.entries(manualSplits).map(([goalId, amt]) => ({
        goalId,
        amount: Number(amt)
      }));
      
      const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(totalSplit - transferAmount) > 0.01) {
        return toast.error(`Total split (${totalSplit.toLocaleString()}) harus sama dengan amount transfer (${transferAmount.toLocaleString()})`);
      }
      
      goalContributions = splits;
    }

    mut.mutate({
      fromAccountId: form.from,
      toAccountId: form.to,
      amount: transferAmount,
      occurredAt: new Date(form.occurredAt).toISOString(),
      note: form.note || undefined,
      goalContributions,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { 
      setOpen(v); 
      if (v) {
        setForm({ from:"", to:"", amount:"", occurredAt: new Date().toISOString().slice(0,16), note:"" });
        setSplitMode("equal");
        setManualSplits({});
      }
    }}>
      <DialogTrigger asChild={asChild}>
        {children ?? <Button size="sm" variant="outline"><Shuffle className="h-4 w-4 mr-2" />Transfer</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Transfer antar Akun</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.from} onValueChange={(v)=> { setForm(f=>({...f, from:v})); }}>
              <SelectTrigger><SelectValue placeholder="Dari akun" /></SelectTrigger>
              <SelectContent>
                {(accs?.items ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.to} onValueChange={(v)=> { setForm(f=>({...f, to:v})); refetchLinkedGoals(); }}>
              <SelectTrigger><SelectValue placeholder="Ke akun" /></SelectTrigger>
              <SelectContent>
                {(accs?.items ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Nominal" type="number" value={form.amount} onChange={e=>setForm(f=>({...f, amount:e.target.value}))} />
          <Input type="datetime-local" value={form.occurredAt} onChange={e=>setForm(f=>({...f, occurredAt:e.target.value}))} />
          <Input placeholder="Catatan (opsional)" value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))} />
          
          {/* Goal Contribution Split */}
          {linkedGoals.length > 0 && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
              <div className="text-sm font-medium">
                🎯 {linkedGoals.length} Goal terhubung ke akun ini
              </div>
              
              {hasMultipleGoals && (
                <RadioGroup value={splitMode} onValueChange={(v) => setSplitMode(v as "equal"|"manual")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="equal" id="equal" />
                    <Label htmlFor="equal" className="text-sm cursor-pointer">Bagi rata otomatis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="text-sm cursor-pointer">Atur manual per goal</Label>
                  </div>
                </RadioGroup>
              )}

              {splitMode === "equal" && hasMultipleGoals && (
                <div className="text-xs text-muted-foreground">
                  Setiap goal akan mendapat: <strong>Rp {form.amount ? (Number(form.amount) / linkedGoals.length).toLocaleString('id-ID', {maximumFractionDigits: 0}) : '0'}</strong>
                </div>
              )}

              {(!hasMultipleGoals || splitMode === "manual") && (
                <div className="space-y-2">
                  {linkedGoals.map(goal => (
                    <div key={goal.id} className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: goal.color || "#3b82f6" }} />
                      <Label className="text-xs flex-1">{goal.name}</Label>
                      {splitMode === "manual" ? (
                        <Input
                          type="number"
                          placeholder="0"
                          value={manualSplits[goal.id] || ""}
                          onChange={(e) => setManualSplits(prev => ({ ...prev, [goal.id]: e.target.value }))}
                          className="w-32 h-8 text-xs"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground w-32 text-right">
                          {form.amount ? `Rp ${Number(form.amount).toLocaleString('id-ID', {maximumFractionDigits: 0})}` : '-'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={mut.isPending}>Transfer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
