"use client";

import { useState } from "react";
import { toast } from "sonner";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { 
  Wallet, 
  Utensils, 
  ShoppingCart, 
  Home, 
  Car, 
  Coffee, 
  Heart, 
  Gift, 
  DollarSign, 
  TrendingUp, 
  Briefcase, 
  Copy
} from "lucide-react";

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
import { Checkbox } from "./ui/checkbox";

// Icon mapper
const iconMap: Record<
  string, React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  Wallet,
  Utensils,
  ShoppingCart,
  Home,
  Car,
  Coffee,
  Heart,
  Gift,
  DollarSign,
  TrendingUp,
  Briefcase,
};

type Row = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  archived: boolean;
  note: string;
  createdAt: string
};
type ListRes = {
  items: Row[];
  page: number;
  limit: number;
  total: number
};

export default function BudgetModal({
  asChild = false,
  children,
  type,
  startDate = 1,
  id = "",
  initial = {
    period: currentPeriod(startDate),
    categoryId: "",
    limitAmount: "",
    carryover: false,
    accumulatedCarryover: 0,
  },
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  type?: "add" | "edit";
  startDate?: number;
  id?: string;
  initial?: {
    period: string;
    categoryId: string;
    limitAmount: string;
    carryover: boolean;
    accumulatedCarryover: number;
  };
}) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  
  const { data: cats } = useApiQuery<ListRes>(
    ["cats-budget"],
    () => api.get("/api/categories?limit=100&page=1&kind=expense"),
    { placeholderData: keepPreviousData}
  );

  const copy = useApiMutation<{ amount: number }, { categoryId: string; period: string }>(
    ({ categoryId, period }) => api.get(`/api/budgets/${categoryId}/copy?lastPeriodMonth=${period}`),
    {
      onSuccess: (data) => {
        setForm((f) => ({ ...f, limitAmount: data.amount.toString() }));
        toast.success("Berhasil menyalin nominal dari periode sebelumnya");
      }
    }
  );

  const getAccumulatedCarryover = useApiMutation<{ accumulatedCarryover: number }, { categoryId: string; period: string }>(
    ({ categoryId, period }) => api.get(`/api/budgets/${categoryId}?periodMonth=${period}`),
    {
      onSuccess: (data) => {
        setForm((f) => ({ ...f, accumulatedCarryover: data.accumulatedCarryover }));
        toast.success("Berhasil mendapatkan sisa budget dari periode sebelumnya");
      }
    }
  );

  const create = useApiMutation<{ id: string }, {
    categoryId: string;
    period: string;
    limitAmount: number;
    carryover: boolean;
  }>(
    (payload) => api.post("/api/budgets", payload), {
      onSuccess: () => {
      toast.success("Budget dibuat");
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setOpen(false);
    },
  });

  const patch = useApiMutation<{ ok: true }, {
    limitAmount: number;
    carryover: boolean;
    accumulatedCarryover?: number;
  }>(
    (payload) => api.patch(`/api/budgets/${id}`, payload), {
      onSuccess: () => {
        toast.success("Budget diperbarui");
        queryClient.invalidateQueries({ queryKey: ["budgets"] });
        setOpen(false);
      }
    }
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (v) setForm(initial); }}
    >
      <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === "add" ? "Tambah" : "Edit"} Budget
          </DialogTitle>
          <DialogDescription className="hidden sm:block">
            {type === "add"
              ? "Atur budget untuk satu kategori pada periode tertentu."
              : "Perbarui detail budget Anda."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.categoryId || !form.limitAmount)
              return toast.error("Lengkapi kategori & nominal");

            if (type === "add") {
              create.mutate({
                categoryId: form.categoryId,
                period: form.period,
                limitAmount: Number(form.limitAmount),
                carryover: form.carryover,
              });
            } else {
              patch.mutate({
                limitAmount: Number(form.limitAmount),
                carryover: form.carryover,
                accumulatedCarryover: form.carryover ? form.accumulatedCarryover : 0,
              });
            }
          }}
        >
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Periode Budget <span className="text-red-500">*</span>
            </label>
            <Input
              type="month"
              value={form.period}
              disabled={type === "edit"}
              onChange={e => setForm(
                (f) => ({ ...f, period: e.target.value })
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Kategori <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.categoryId}
                disabled={type === "edit"}
                onValueChange={(v) => setForm(
                  (f) => ({ ...f, categoryId: v })
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {(cats?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(() => {
                        const IconComponent = getIconComponent(c.icon);
                        return <IconComponent className="h-5 w-5 m-auto" />;
                      })()}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full flex flex-col justify-end mb-1">
              <Button
                type="button"
                variant="outline"
                className="text-xs font-medium"
                onClick={async () => {
                  if (!form.categoryId) return toast.error("Pilih kategori terlebih dahulu");

                  copy.mutate({
                    categoryId: form.categoryId,
                    period: form.period
                  });
                }}
                disabled={!form.categoryId || copy.isPending}
              >
                <Copy className="w-4.5 h-4.5" /> 
                <span className="text-wrap text-left">Copy dari periode sebelumnya</span>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Nilai Budget <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  placeholder="0"
                  value={form.limitAmount ? new Intl.NumberFormat('id-ID').format(Number(form.limitAmount)) : '0'}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    setForm(f => ({...f, limitAmount: value || '0'}));
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full flex items-center lg:mt-6 mt-4">
              <Checkbox
                checked={form.carryover}
                onCheckedChange={(checked) => {
                  setForm(
                    f => ({ ...f, carryover: checked === true })
                  )

                  if (checked) {
                    toast.info("Get last period's accumulative carryover amount added to this budget total.");
                    
                    getAccumulatedCarryover.mutate({
                      categoryId: form.categoryId,
                      period: form.period
                    });
                  }
                }}
              />
              <label className="ml-2 text-xs font-medium text-muted-foreground">
                Tambahkan sisa budget bulan lalu ke budget bulan ini
              </label>
            </div>
          </div>
          <div className="px-2.5 py-2 rounded-xl bg-secondary flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs font-medium text-secondary-foreground">
              <div>Total budget bulan ini</div>
              <div className="font-semibold">
                Rp {new Intl.NumberFormat('id-ID').format(
                  Number(form.limitAmount) + 
                  (form.carryover ? form.accumulatedCarryover : 0)
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {form.carryover
                ? `Sisa budget dari periode sebelumnya sebesar Rp ${new Intl.NumberFormat('id-ID').format(form.accumulatedCarryover)} telah ditambahkan ke total budget periode ini.`
                : "Sisa budget dari periode sebelumnya tidak akan ditambahkan ke total budget periode ini."}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={create.isPending || copy.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function currentPeriod(startDate: number = 1) {
  const [y, m, d] = new Date().toISOString().split("T")[0].split("-").map(Number);
  if (d < startDate) {
    const prevMonth = m - 1 === 0 ? 12 : m - 1;
    const prevYear = prevMonth === 12 ? y - 1 : y;
    return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  } else {
    return `${y}-${String(m).padStart(2, "0")}`;
  }
}

const getIconComponent = (iconName: string) => {
  return iconMap[iconName] || Wallet; // Default to Wallet if not found
};
