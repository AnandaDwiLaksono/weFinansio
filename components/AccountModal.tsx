"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useApiMutation, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

const currencyOptions = [
  { value: "IDR", label: "Rp" },
  { value: "USD", label: "$" },
  { value: "EUR", label: "€" },
];

export default function AccountModal({
  asChild = false,
  children,
  type,
  id = "",
  initial = { name: "", type: "cash", currency: "IDR", balance: 0, archived: false, note: "" }
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  type?: string | 'add' | 'edit';
  id?: string;
  initial?: {
    name: string;
    type: "cash" | "bank" | "ewallet" | "investment";
    currency: string;
    balance: number;
    archived: boolean;
    note: string;
  };
}) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);

  const create = useApiMutation<{id: string}, {
    name: string;
    type: string;
    currency: string;
    balance: number;
    archived: boolean;
    note: string;
  }>(
    (payload) => api.post("/api/accounts", payload),
    { 
      onSuccess: () => {
        toast.success("Akun dibuat");
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        setOpen(false);
      }
    }
  );

  const patch = useApiMutation<{ok: true}, {
    name: string;
    type: string;
    currency: string;
    balance: number;
    archived: boolean;
    note: string;
  }>(
    (payload) => api.patch(`/api/accounts/${id}`, payload),
    { 
      onSuccess: () => {
        toast.success("Akun diperbarui");
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        setOpen(false);
      }
    }
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (v) setForm(initial); }}
    >
      <DialogTrigger asChild={asChild}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type === "add" ? "Tambah" : "Edit"} Akun
          </DialogTitle>
          <DialogDescription className="hidden sm:block">
            {type === "add" ? "Buat sumber dana baru untuk dompet, rekening, atau e-wallet." : "Perbarui nama, jenis akun, atau catatan tanpa mengubah riwayat transaksi."}
          </DialogDescription>
        </DialogHeader>
        <h3 className="text-xs font-medium text-muted-foreground tracking-wider">
          DETAIL AKUN
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name) return toast.error("Nama wajib diisi");

            if (type === "add") {
              create.mutate({
                name: form.name,
                type: form.type,
                currency: form.currency,
                balance: Number(form.balance || 0),
                archived: form.archived,
                note: form.note,
              });
            } else {
              patch.mutate({
                name: form.name,
                type: form.type,
                currency: form.currency,
                balance: Number(form.balance || 0),
                archived: form.archived,
                note: form.note,
              });
            }
          }}
          className="grid gap-2"
        >
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nama Akun <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: Dompet, BRI, Gopay..."
              value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Jenis Akun <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm(f => ({...f, type: v as "cash" | "bank" | "ewallet" | "investment"}))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Jenis akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="bank">Rekening Bank</SelectItem>
                  <SelectItem value="ewallet">E-Wallet</SelectItem>
                  <SelectItem value="investment">Investasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Mata Uang <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm(f => ({...f, currency: v as "IDR" | "USD" | "EUR"}))}
                disabled={type === "edit"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mata uang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Saldo awal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currencyOptions.find(c => c.value === form.currency)?.label}
                </span>
                <Input
                  placeholder="0"
                  value={form.balance ? new Intl.NumberFormat('id-ID').format(Number(form.balance)) : '0'}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    setForm(f => ({...f, balance: value ? Number(value) : 0}));
                  }}
                  disabled={type === "edit"}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={form.archived ? "true" : "false"}
                onValueChange={(v) => setForm(f => ({...f, archived: v === "true"}))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aktif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Aktif</SelectItem>
                  <SelectItem value="true">Diarsipkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Catatan
            </label>
            <Input
              placeholder="Tambahkan catatan (opsional)"
              value={form.note}
              onChange={
                e => setForm(f => ({...f, note: e.target.value as unknown as string}))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
