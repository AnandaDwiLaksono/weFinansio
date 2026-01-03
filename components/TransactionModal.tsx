"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TransactionResponse = {
  items: {
    id: string;
    occurredAt: string;
    amount: string;
    type: "income" | "expense" | "transfer";
    accountId: string;
    transferToAccountId: string | null;
    categoryId: string | null;
    notes: string | null;
  }[];
};
type LinkedGoalsResponse = { items: { id: string; name: string; color: string | null }[] };
type GoalContributionsResponse = {
  items: { id: string; goalId: string; transactionId: string; amount: string }[]
};

export default function TransactionModal({
  asChild = false,
  children,
  type = "add",
  id = "",
  accounts,
  categories,
  initial = {
    occurredAt: new Date().toISOString().slice(0, 10),
    type: "expense",
    accountId: "",
    transferToAccountId: "",
    categoryId: "",
    amount: "",
    note: "",
  },
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  type?: "add" | "edit";
  id?: string;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: "income" | "expense" }[];
  initial?: {
    occurredAt: string;
    type: "expense" | "income" | "transfer";
    accountId: string;
    transferToAccountId: string;
    categoryId: string;
    amount: string;
    note: string;
  };
}) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [asGoalContribution, setAsGoalContribution] = useState(false);
  const [selectedGoalOption, setSelectedGoalOption] = useState("");

  // Fetch transaction data when editing
  const { data: trxData, isLoading } = useApiQuery<TransactionResponse>(
    ["transaction", id],
    () => api.get(`/api/transactions?page=1&limit=100`),
    { enabled: open && type === "edit" && !!id }
  );

  // Linked goals for source/destination accounts
  const { data: linkedFrom } = useApiQuery<LinkedGoalsResponse>(
    ["linked-goals", form.accountId],
    () => api.get(`/api/accounts/${form.accountId}/linked-goals`),
    { enabled: open && !!form.accountId }
  );

  const { data: linkedTo } = useApiQuery<LinkedGoalsResponse>(
    ["linked-goals", form.transferToAccountId],
    () => api.get(`/api/accounts/${form.transferToAccountId}/linked-goals`),
    { enabled: open && form.type === "transfer" && !!form.transferToAccountId }
  );

  // Fetch goal contributions when editing
  const { data: goalContributions } = useApiQuery<GoalContributionsResponse>(
    ["goal-contributions", id],
    () => api.get(`/api/goals/${id}/contributions`),
    { enabled: open && type === "edit" && !!id }
  );

  // Populate goal contribution state when editing
  useEffect(() => {
    if (!open || type !== "edit") return; // Only run when modal is open and in edit mode
    
    if (goalContributions?.items && goalContributions.items.length > 0 && id) {
      const contrib = Array.isArray(goalContributions.items) 
        ? goalContributions.items[0] 
        : goalContributions.items;
      
      setAsGoalContribution(true);
      const viaAccount = form.type !== "transfer" 
        ? form.accountId
        : (goalContributions.items[0].amount.startsWith("-") ? form.accountId : form.transferToAccountId);
      setSelectedGoalOption(`${contrib.goalId}|${viaAccount}`);
    } else if (goalContributions?.items) {
      // Data loaded but no goal contribution found
      setAsGoalContribution(false);
    }
  }, [open, goalContributions, form.type, form.accountId, form.transferToAccountId, id, type]);

  // Create mutation
  const create = useApiMutation<{ id: string }, {
    occurredAt: string;
    amount: number;
    type: "expense" | "income" | "transfer";
    accountId: string;
    transferToAccountId?: string | null;
    categoryId?: string | null;
    notes?: string | null;
  }>((payload) => api.post("/api/transactions", payload));

  const createGoalContribution = useApiMutation<{ ok: true }, {
    goalId: string;
    type: "deposit" | "withdraw";
    amount: number;
    occurredAt: string;
    note?: string;
    accountId: string;
    targetAccountId?: string;
    transactionId?: string; // Optional transaction ID from TransactionModal
  }>(
    ({ goalId, ...rest }) => api.post(`/api/goals/${goalId}/entries`, rest),
    { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }) }
  );

  // Update mutation
  const patch = useApiMutation<{ ok: true }, {
    occurredAt?: string;
    amount?: number;
    notes?: string | null;
  }>((payload) => api.patch(`/api/transactions/${id}`, payload));
  
  const patchGoalContribution = useApiMutation<{ ok: true }, {
    occurredAt?: string;
    amount?: number;
    notes?: string | null;
  }>(
    (payload) => api.patch(`/api/goals/${id}/contributions`, payload),
    { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }) }
  );

  // Load transaction data when editing
  useEffect(() => {
    if (type === "edit" && trxData?.items && id) {
      const t = trxData.items.find((x) => x.id === id);
      if (t) {
        setForm({
          occurredAt: t.occurredAt
            ? new Date(t.occurredAt).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          type: t.type,
          accountId: t.accountId,
          transferToAccountId: t.transferToAccountId || "",
          categoryId: t.categoryId || "",
          amount: t.amount,
          note: t.notes || "",
        });
      }
    }
  }, [trxData, id, type]);

  // Build goal options based on selected accounts
  const goalOptions = useMemo(() => {
    const opts: { goalId: string; goalName: string; viaAccountId: string }[] = [];

    linkedFrom?.items.forEach((g) => {
      opts.push({ goalId: g.id, goalName: g.name, viaAccountId: form.accountId });
    });

    linkedTo?.items.forEach((g) => {
      opts.push({ goalId: g.id, goalName: g.name, viaAccountId: form.transferToAccountId });
    });

    return opts;
  }, [form.type, form.accountId, form.transferToAccountId, linkedFrom?.items, linkedTo?.items]);

  // Auto-select first goal option when available
  useEffect(() => {
    if (type === "add" && goalOptions.length > 0 && !asGoalContribution) {
      // Only auto-select for add mode when goal contribution is not checked
      setSelectedGoalOption((prev) => prev || `${goalOptions[0].goalId}|${goalOptions[0].viaAccountId}`);
    } else if (goalOptions.length === 0) {
      setSelectedGoalOption("");
      if (type === "add") setAsGoalContribution(false);
    }
  }, [goalOptions, asGoalContribution, type]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v && type === "add") {
      // Only reset on open for add mode
      setForm(initial);
      setAsGoalContribution(false);
      setSelectedGoalOption("");
    } else if (!v) {
      // Reset on close for both modes
      setForm(initial);
      setAsGoalContribution(false);
      setSelectedGoalOption("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.occurredAt || !form.type || !form.accountId || !form.amount) {
      toast.error("Lengkapi data wajib");
      return;
    }

    if (type === "add") {
      const payload = {
        occurredAt: new Date(form.occurredAt).toISOString().slice(0, 10),
        amount: Number(form.amount),
        type: form.type as "expense" | "income" | "transfer",
        accountId: form.accountId,
        transferToAccountId: form.type === "transfer" ? form.transferToAccountId : null,
        categoryId: form.categoryId || null,
        notes: form.note || null,
      };

      const shouldCreateGoalContribution =
        type === "add" &&
        asGoalContribution &&
        goalOptions.length > 0 &&
        selectedGoalOption;

      const createContribution = async (transactionId: string) => {
        if (!shouldCreateGoalContribution) return;

        const [goalId, viaAccountId] = selectedGoalOption.split("|");
        if (!goalId || !viaAccountId) return;

        // Determine contribution type based on transaction type
        let contributionType: "deposit" | "withdraw";
        let targetAccountId: string;

        if (form.type === "transfer") {
          // For transfers: check if destination account is the goal account
          if (!form.transferToAccountId) return;
          const isDeposit = viaAccountId === form.transferToAccountId;
          contributionType = isDeposit ? "deposit" : "withdraw";
          targetAccountId = form.transferToAccountId;
        } else if (form.type === "income") {
          // Income to goal account = deposit
          contributionType = "deposit";
          targetAccountId = form.accountId;
        } else {
          // Expense from goal account = withdraw
          contributionType = "withdraw";
          targetAccountId = form.accountId;
        }

        await createGoalContribution.mutateAsync({
          goalId,
          type: contributionType,
          amount: Number(form.amount),
          occurredAt: form.occurredAt.split("T")[0],
          note: form.note,
          accountId: form.accountId,
          targetAccountId: targetAccountId,
          transactionId: transactionId, // Pass transaction ID
        });
      };

      create.mutate(payload, {
        onSuccess: async (response) => {
          await createContribution(response.id);

          toast.success("Transaksi ditambahkan");

          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          
          setOpen(false);
        },
      });
    } else {
      const payload = {
        occurredAt: new Date(form.occurredAt).toISOString().slice(0, 10),
        amount: Number(form.amount),
        note: form.note,
      };

      patch.mutate(payload, {
        onSuccess: async () => {
          if (goalContributions?.items && goalContributions.items.length > 0) {
            // tentukan apakah amount positif atau negatif berdasarkan tipe kontribusi
            const contribution = Array.isArray(goalContributions.items)
              ? goalContributions.items[0]
              : goalContributions.items;

            const amountSign = contribution.amount.startsWith("-") ? -1 : 1;

            await patchGoalContribution.mutateAsync({
              occurredAt: payload.occurredAt,
              amount: Number(payload.amount * amountSign),
              notes: payload.note,
            });
          }

          toast.success("Transaksi diperbarui");

          queryClient.invalidateQueries({ queryKey: ["transactions"] });
          queryClient.invalidateQueries({ queryKey: ["accounts"] });

          setOpen(false);
        },
      });
    }
  };

  // Filter categories based on transaction type
  const filteredCategories = form.type === "transfer" ? [] : categories.filter((c) => c.kind === form.type);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {type === "add" ? "Tambah" : "Edit"} Transaksi
          </DialogTitle>
          <DialogDescription className="hidden sm:block">
            {type === "add" ? "Catat pemasukan, pengeluaran, atau transfer antar akun." : "Perbarui detail transaksi yang sudah dicatat."}
          </DialogDescription>
        </DialogHeader>

        {type === "edit" && isLoading ? (
          <div className="text-sm text-muted-foreground py-4">Memuat...</div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-3 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              {/* Tanggal */}
              <div className="w-full space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={form.occurredAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, occurredAt: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Jenis Transaksi */}
              <div className="w-full space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Jenis Transaksi <span className="text-red-500">*</span>
                </label>
                <Select
                  value={form.type}
                  onValueChange={(v: "expense" | "income" | "transfer") =>
                    setForm((f) => ({ ...f, type: v, categoryId: "" }))
                  }
                  required
                  disabled={type === "edit"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Pengeluaran</SelectItem>
                    <SelectItem value="income">Pemasukan</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Akun Sumber */}
              <div className="w-full space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {form.type === "transfer" ? "Dari Akun" : "Akun"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={form.accountId}
                  onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
                  required
                  disabled={type === "edit"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih akun" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== form.transferToAccountId)
                      .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Akun Tujuan (hanya untuk transfer) */}
              {form.type === "transfer" && (
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Ke Akun <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.transferToAccountId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, transferToAccountId: v }))
                    }
                    disabled={type === "edit"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih akun tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== form.accountId)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Kategori (tidak untuk transfer) */}
              {form.type !== "transfer" && (
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Kategori <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, categoryId: v }))
                    }
                    disabled={type === "edit"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Goal contribution prompt when linked account detected */}
            {goalOptions.length > 0 && (
              <div className="rounded-md border p-3 bg-muted/40 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Catat sebagai kontribusi goal?
                  </div>
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <input
                      type="checkbox"
                      className="w-3 h-3"
                      checked={asGoalContribution}
                      onChange={(e) => setAsGoalContribution(e.target.checked)}
                      disabled={type === "edit"}
                    />
                    <span>Ya, catat juga</span>
                  </label>
                </div>
                {asGoalContribution && (
                  <div className="w-full space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Pilih goal terhubung
                    </label>
                    <Select
                      value={selectedGoalOption}
                      onValueChange={(v) => setSelectedGoalOption(v)}
                      disabled={type === "edit"}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Pilih goal" />
                      </SelectTrigger>
                      <SelectContent>
                        {goalOptions.map((g) => {
                          // const direction = g.viaAccountId === form.transferToAccountId ? "Masuk ke goal" : "Keluar dari goal";
                          const direction = form.type === "transfer"
                            ? (g.viaAccountId === form.transferToAccountId ? "Deposit" : "Withdraw")
                            : form.type === "income"
                              ? "Deposit"
                              : "Withdraw";
                          return (
                            <SelectItem
                              key={`${g.goalId}-${g.viaAccountId}`}
                              value={`${g.goalId}|${g.viaAccountId}`}
                            >
                              {g.goalName} ({direction})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Jumlah */}
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
                  value={form.amount ? new Intl.NumberFormat('id-ID').format(Number(form.amount)) : '0'}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    setForm(f => ({...f, amount: value ? value : '0'}));
                  }}
                  className="pl-8"
                  required
                />
              </div>
            </div>

            {/* Catatan */}
            <div className="w-full space-y-1">
              <Label>Catatan</Label>
              <Input
                placeholder="Opsional"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || patch.isPending}
              >
                Simpan
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
