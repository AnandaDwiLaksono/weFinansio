"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";

type EntryRow = {
  id: string;
  occurredAt: string;
  amount: string;
  note: string | null;
};

export default function GoalContributionModal({
  goalId,
  goalLinkedAccountId,
  goalName,
  children,
}: {
  goalId: string;
  goalLinkedAccountId?: string | null;
  goalName?: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "deposit" as "deposit" | "withdraw",
    amount: "",
    occurredAt: new Date().toISOString().slice(0, 10),
    note: "",
    accountId: "",
    targetAccountId: goalLinkedAccountId || "",
  });

  // daftar akun sumber untuk transfer
  const { data: accs } = useApiQuery<{ items: { id: string; name: string }[] }>(
    ["acc-for-goal"],
    () => api.get("/api/accounts"),
    { staleTime: 60_000 }
  );

  // riwayat kontribusi goal
  const { data: history, refetch } = useApiQuery<{ items: EntryRow[] }>(
    ["goal-entries", goalId],
    () => api.get(`/api/goals/${goalId}/entries`),
    { enabled: open }
  );

  const create = useApiMutation<{ ok: true }, {
    type: "deposit" | "withdraw";
    amount: number;
    occurredAt: string;
    note?: string;
    accountId: string;
    targetAccountId?: string;
  }>(
    (payload) => api.post(`/api/goals/${goalId}/entries`, payload),
    {
      onSuccess: () => {
        toast.success("Kontribusi tercatat");

        queryClient.invalidateQueries({ queryKey: ["goal-entries", goalId] });
        queryClient.invalidateQueries({ queryKey: ["goals"] });

        resetState();
      },
    }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.amount) return toast.error("Nominal wajib diisi");
    if (!form.accountId || !form.targetAccountId) return toast.error("Pilih akun sumber dan tujuan.");

    const num = Number(form.amount.replace(/\D/g, ""));
    if (!num || Number.isNaN(num) || num <= 0)
      return toast.error("Nominal tidak valid");

    create.mutate({
      type: form.type,
      amount: num,
      occurredAt: form.occurredAt,
      note: form.note || undefined,
      accountId: form.accountId,
      targetAccountId: form.targetAccountId,
    });
  }

  function resetState() {
    setForm({
      type: "deposit",
      amount: "",
      occurredAt: new Date().toISOString().slice(0, 10),
      note: "",
      accountId: "",
      targetAccountId: goalLinkedAccountId || "",
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (v) resetState(); }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tambah Goal Kontribusi</DialogTitle>
          <DialogDescription>
            Catat transaksi kontribusi goal{" "}<strong>{goalName || ""}</strong>.
          </DialogDescription>
        </DialogHeader>
        <hr />
        <form onSubmit={handleSubmit} className="grid gap-3 flex-shrink-0">
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Tipe transaksi <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.type === "deposit"}
                  onChange={() => setForm((f) => ({ ...f, type: "deposit" }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Setor ke goal</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.type === "withdraw"}
                  onChange={() => setForm((f) => ({ ...f, type: "withdraw" }))}
                  className="w-4 h-4"
                />
                <span className="text-sm">Tarik dari goal</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {form.type === "deposit" ? "Transfer dari" : "Transfer ke"}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.type === "deposit" ? form.accountId : (goalLinkedAccountId ? "" : form.targetAccountId)}
                onValueChange={(v) => setForm((f) => {
                  if (form.type === "deposit") {
                    return { ...f, accountId: v };
                  } else {
                    return { ...f, targetAccountId: v };
                  }
                })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={`Pilih akun ${
                      form.type === "deposit" ? "sumber" : "tujuan"
                    }`}
                  />
                </SelectTrigger>
                <SelectContent>
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
                {form.type === "deposit" ? "Transfer ke (Goal)" : "Transfer dari (Goal)"}{" "}<span className="text-red-500">*</span>
              </label>
              {goalLinkedAccountId ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm">
                  <span className="text-muted-foreground">
                    {accs?.items?.find((a) => a.id === goalLinkedAccountId)
                      ?.name || "Rekening goal"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (terhubung)
                  </span>
                </div>
              ) : (
                <Select
                  value={form.type === "withdraw" ? form.accountId : form.targetAccountId}
                  onValueChange={(v) => setForm((f) => {
                    if (form.type === "withdraw") {
                      return { ...f, accountId: v };
                    } else {
                      return { ...f, targetAccountId: v };
                    }
                  })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih akun goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accs?.items ?? []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Nominal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  placeholder="0"
                  value={form.amount ? new Intl.NumberFormat("id-ID").format(Number(form.amount.replace(/\D/g, ""))) : "0"}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setForm((f) => ({ ...f, amount: value ? value : "0" }));
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
              <Input
                type="date"
                value={form.occurredAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, occurredAt: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Catatan</label>
            <Input
              placeholder="Catatan kontribusi (opsional)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Tutup
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Simpan
            </Button>
          </div>
        </form>

        {/* Riwayat kontribusi */}
        <div className="border-t pt-3 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <div className="text-sm font-medium">Riwayat goal kontribusi</div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Tanggal</TableHead>
                  <TableHead className="text-center">Nominal</TableHead>
                  <TableHead className="text-center">Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history?.items ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(e.occurredAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell
                      className={`text-right text-xs font-semibold ${
                        Number(e.amount) >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {rupiah(Number(e.amount))}
                    </TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">
                      {e.note}
                    </TableCell>
                  </TableRow>
                ))}
                {(!history?.items || history.items.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-xs text-muted-foreground text-center py-4"
                    >
                      Belum ada kontribusi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
