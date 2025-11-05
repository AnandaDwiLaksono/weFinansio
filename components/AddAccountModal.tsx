"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useApiMutation, api } from "@/lib/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const Schema = z.object({
  name: z.string().min(2),
  type: z.enum(["cash","bank","ewallet","investment"]),
  currencyCode: z.string().length(3),
});
type FormValues = z.infer<typeof Schema>;

export default function AddAccountModal() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(Schema), defaultValues: { currencyCode: "IDR" } });

  const mutation = useApiMutation<{id:string}, FormValues>(
    (vars) => api.post("/api/accounts", vars),
    {
      toastSuccess: "Akun ditambahkan",
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["accounts"] });
        setOpen(false);
      },
    }
  );

  const onSubmit = (v: FormValues) => mutation.mutate(v);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">+ Akun</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Tambah Akun</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid gap-2">
            <Label>Nama Akun</Label>
            <Input placeholder="Contoh: BCA, Dompet" {...register("name")} />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Jenis</Label>
            <Select onValueChange={(v)=>setValue("type", v as "cash" | "bank" | "ewallet" | "investment")}>
              <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="ewallet">E-Wallet</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Mata Uang</Label>
            <Input placeholder="IDR" maxLength={3} {...register("currencyCode")} />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={()=>setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={mutation.isPending}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
