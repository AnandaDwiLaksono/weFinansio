"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { submitTransaction } from "@/lib/offlineQueue";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FormSchema = z.object({
  accountId: z.uuid(),
  categoryId: z.uuid().optional(),
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.string().min(1),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

export default function AddTransactionModal({
  accounts, categories, userId
}: {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, setValue, formState: { isSubmitting } } =
    useForm<FormValues>({ 
      resolver: zodResolver(FormSchema),
      defaultValues: {
        type: "expense"
      }
    });

  const onSubmit = async (v: FormValues) => {
    await submitTransaction({
      ...v,
      occurredAt: new Date().toISOString(),
      clientId: crypto.randomUUID(),
      userId
    });
    setOpen(false);
    // optionally: toast
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">+ Tambah Transaksi</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tambah Transaksi</DialogTitle></DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid gap-2">
            <Label>Akun</Label>
            <Select onValueChange={(v) => setValue("accountId", v)}>
              <SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Kategori</Label>
            <Select onValueChange={(v) => setValue("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="(Opsional)" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Jenis</Label>
            <Select defaultValue="expense" onValueChange={(v)=>setValue("type", v as "expense" | "income" | "transfer")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Jumlah (IDR)</Label>
            <Input type="number" step="0.01" {...register("amount")} placeholder="0.00" />
          </div>

          <div className="grid gap-2">
            <Label>Catatan</Label>
            <Input {...register("note")} placeholder="Opsional" />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={()=>setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
