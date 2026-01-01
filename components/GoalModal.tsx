"use client";

import { useState } from "react";
import { toast } from "sonner";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";

import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function GoalModal({
  asChild = false,
  children,
  type,
  id = "",
  initial = {
    name: "",
    targetAmount: 0,
    targetDate: "",
    startAmount: 0,
    linkedAccountId: "",
    archived: false,
    note: "",
    color: "#3b82f6",
  }
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  type?: "add" | "edit";
  id?: string;
  initial?: {
    name: string;
    targetAmount: number;
    targetDate: string;
    startAmount: number;
    linkedAccountId: string;
    archived: boolean;
    note: string;
    color: string;
  };
}) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);

  const { data: accs } = useApiQuery<{ items: { id: string; name: string }[] }>(
    ["acc-for-goal"],
    () => api.get("/api/accounts"),
    { staleTime: 60_000, enabled: open, placeholderData: keepPreviousData }
  );

  const create = useApiMutation<{ id: string }, {
    name: string;
    targetAmount: number;
    targetDate?: string;
    startAmount: number;
    linkedAccountId?: string;
    archived: boolean;
    note: string;
    color: string;
  }>(
    (payload) => api.post("/api/goals", payload),
    {
      onSuccess: () => {
        toast.success("Goal dibuat");
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        setOpen(false);
      },
    }
  );

  const patch = useApiMutation<{ok: true}, {
    name: string;
    targetAmount: number;
    targetDate?: string;
    startAmount: number;
    linkedAccountId?: string;
    archived: boolean;
    note: string;
    color: string;
  }>(
    (payload) => api.patch(`/api/goals/${id}`, payload),
    { 
      onSuccess: () => {
        toast.success("Goal diperbarui");
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        setOpen(false);
      }
    }
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {setOpen(v); if (v) setForm(initial); }}
    >
      <DialogTrigger asChild={asChild}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type === "add" ? "Tambah" : "Edit"} Goal
          </DialogTitle>
          <DialogDescription className="hidden sm:block">
            {type === "add" ? "Buat tujuan finansial baru dan pantau progressnya." : "Perbarui detail goal dan pantau progressnya."}
          </DialogDescription>
        </DialogHeader>
        <hr />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name || !form.targetAmount)
              return toast.error("Nama & target wajib diisi");
            
            if (type === "add") {
              create.mutate({
                name: form.name,
                targetAmount: Number(form.targetAmount),
                targetDate: form.targetDate || undefined,
                startAmount: Number(form.startAmount || 0),
                linkedAccountId: form.linkedAccountId || undefined,
                archived: form.archived,
                note: form.note,
                color: form.color,
              });
            } else {
              patch.mutate({
                name: form.name,
                targetAmount: Number(form.targetAmount),
                targetDate: form.targetDate || undefined,
                startAmount: Number(form.startAmount || 0),
                linkedAccountId: form.linkedAccountId || undefined,
                archived: form.archived,
                note: form.note,
                color: form.color,
              });
            }
          }}
          className="grid gap-3"
        >
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nama goal <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: Dana darurat 1 tahun, Nikah, Liburan"
              value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Target jumlah <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  placeholder="0"
                  value={form.targetAmount ? new Intl.NumberFormat('id-ID').format(Number(form.targetAmount)) : '0'}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    setForm(f => ({...f, targetAmount: value ? Number(value) : 0}));
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Saldo awal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  placeholder="0"
                  value={form.startAmount ? new Intl.NumberFormat('id-ID').format(Number(form.startAmount)) : '0'}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    setForm(f => ({...f, startAmount: value ? Number(value) : 0}));
                  }}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Target tanggal tercapai
              </label>
              <Input
                type="date"
                placeholder="Pilih tanggal target (opsional)"
                value={form.targetDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetDate: e.target.value }))
                }
              />
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Status goal
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
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Hubungkan akun
              </label>
              <Select
                value={form.linkedAccountId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, linkedAccountId: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih akun tabungan untuk goal ini (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">Tidak ada</SelectItem>
                  {(accs?.items ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Warna
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-12 rounded border"
                  value={form.color}
                  onChange={e => setForm(
                    f => ({...f, color:e.target.value})
                  )}
                />
                <Input
                  value={form.color}
                  onChange={e => setForm(
                    f => ({...f, color:e.target.value})
                  )}
                />
              </div>
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
