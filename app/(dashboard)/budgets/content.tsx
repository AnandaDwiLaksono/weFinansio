"use client";

import { useState } from "react";
import { Pencil, Trash2, Calendar, Plus } from "lucide-react";

import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import BudgetModal from "@/components/BudgetModal";
import EditBudgetModal from "@/components/EditBudgetModal";
import { keepPreviousData } from "@tanstack/react-query";
import BudgetDonut from "@/components/BudgetDonut";

type Item = {
  id: string;
  period: string;
  limit: number;
  spent: number;
  remaining: number;
  progress: number;
  categoryId: string;
  categoryName: string;
  categoryKind: "income" | "expense";
  categoryColor?: string | null;
  categoryIcon?: string | null;
};
type Res = {
  period: string;
  items: Item[];
  total: { limit: number; spent: number; remaining: number };
};

export default function BudgetsContent() {
  const [period, setPeriod] = useState(currentPeriod());
  const [kind, setKind] = useState<"" | "income" | "expense">("");
  const [q, setQ] = useState("");

  const { data, refetch } = useApiQuery<Res>(
    ["budgets", { period, kind, q }],
    () => {
      const params = new URLSearchParams({ period, q });
      if (kind) params.set("kind", kind);
      return api.get("/api/budgets?" + params.toString());
    },
    { placeholderData: keepPreviousData }
  );

  const del = useApiMutation<{ ok: true }, { id: string }>(
    ({ id }) => api.del(`/api/budgets/${id}`),
    { onSuccess: () => refetch() }
  );

  const items = data?.items ?? [];
  const total = data?.total ?? { limit: 0, spent: 0, remaining: 0 };

  async function copyLast() {
    const last = (() => {
      const [y, m] = period.split("-").map(Number);
      const d = new Date(y, m - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();
    await api.post(
      `/api/budgets/copy?from=${last}&to=${period}&overwrite=false`
    );
    await refetch();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Budget</h1>
          <p className="text-sm text-muted-foreground">
            Periode {period} • Total: {rupiah(total.limit)} • Spent:{" "}
            {rupiah(total.spent)}
          </p>
        </div>
        <div className="hidden md:flex gap-2">
          <BudgetModal asChild type="add" onSaved={refetch}>
            <Button size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Tambah Akun
            </Button>
          </BudgetModal>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2 flex gap-2">
            <Calendar className="h-9 w-9 p-2 rounded border" />
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
          <Select
            value={kind}
            onValueChange={(v: "" | "income" | "expense") => setKind(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="expense">Pengeluaran</SelectItem>
              <SelectItem value="income">Pemasukan</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Cari kategori…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="md:col-span-2 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setQ("");
                setKind("");
              }}
            >
              Reset
            </Button>
            <BudgetModal
              onSaved={refetch}
            />
          </div>
          <Button variant="secondary" onClick={copyLast}>
            Copy dari bulan lalu
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Pengeluaran per Kategori (Top)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetDonut items={items} />
          </CardContent>
        </Card>
      )}

      {/* Grid cards (responsive) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-3">
                <span className="truncate">{b.categoryName}</span>
                <span className="text-xs rounded px-2 py-0.5 bg-muted capitalize">
                  {b.categoryKind}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>
                  Limit: <strong>{rupiah(b.limit)}</strong>
                </span>
                <span>
                  Spent:{" "}
                  <strong className={b.spent > b.limit ? "text-red-600" : ""}>
                    {rupiah(b.spent)}
                  </strong>
                </span>
              </div>
              <Progress value={Math.round(b.progress * 100)} className="h-2" />
              <div className="mt-2 text-sm text-muted-foreground">
                Sisa: <strong>{rupiah(b.remaining)}</strong>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <EditBudgetModal
                  id={b.id}
                  initial={{ limitAmount: b.limit, carryover: false }}
                  onSaved={refetch}
                >
                  <Button variant="outline" size="icon" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </EditBudgetModal>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="Hapus"
                  onClick={() => del.mutate({ id: b.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Belum ada budget untuk periode ini.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
