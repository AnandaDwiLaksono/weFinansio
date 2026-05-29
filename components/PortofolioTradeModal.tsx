"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
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

type AssetOption = { symbol: string; name: string };

type PortfolioTradeSide =
  | "BUY"
  | "SELL"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "DIVIDEND"
  | "FEE";

type CreateTradePayload = {
  symbol: string;
  tradeDate: string;
  side: PortfolioTradeSide;
  quantity: number;
  price?: number;
  fee?: number;
  note?: string;
  syncStatus: "pending" | "synced" | "failed";
};

interface FormState {
  symbol: string;
  tradeDate: string;
  side: PortfolioTradeSide;
  quantity: string;
  price: string;
  fee: string;
  note: string;
}

const defaultForm: FormState = {
  symbol: "",
  tradeDate: new Date().toISOString().slice(0, 16),
  side: "BUY",
  quantity: "",
  price: "",
  fee: "0",
  note: "",
};

// Label mapping for trade side
function getSideLabel(side: PortfolioTradeSide): string {
  const labels: Record<PortfolioTradeSide, string> = {
    BUY: "Beli",
    SELL: "Jual",
    TRANSFER_IN: "Transfer Masuk",
    TRANSFER_OUT: "Transfer Keluar",
    DIVIDEND: "Dividen",
    FEE: "Biaya",
  };
  return labels[side] || side;
}

export default function PortofolioTradeModal({
  asChild = false,
  type = "add",
  children,
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  type?: "add" | "edit";
}) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);

  const { data: assetsRes } = useApiQuery<{ items: AssetOption[] }>(
    ["portfolio-assets-options"],
    () => api.get("/api/portofolio/assets-options"),
    { staleTime: 60000 }
  );
  const assets = assetsRes?.items ?? [];

  const mut = useApiMutation<{ ok: true }, CreateTradePayload>(
    (payload) => api.post("/api/portofolio/trades", payload),
    {
      onSuccess: () => {
        toast.success("Transaksi portofolio disimpan");

        queryClient.invalidateQueries({ queryKey: ["portfolio-assets"] });
        queryClient.invalidateQueries({ queryKey: ["portfolio-trades"] });

        setOpen(false);
      },
    }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.symbol) return toast.error("Pilih aset terlebih dahulu");
    if (!form.tradeDate) return toast.error("Tanggal transaksi wajib diisi");

    const isQtyRequired = !["DIVIDEND", "FEE"].includes(form.side);
    if (isQtyRequired && (!form.quantity || Number(form.quantity) <= 0)) {
      return toast.error("Quantity wajib diisi dan > 0");
    }

    mut.mutate({
      symbol: form.symbol,
      tradeDate: new Date(form.tradeDate).toISOString(),
      side: form.side,
      quantity: isQtyRequired ? Number(form.quantity) : 0,
      price: form.price ? Number(form.price) : undefined,
      fee: form.fee ? Number(form.fee) : undefined,
      note: form.note || undefined,
      syncStatus: "pending",
    });
  }

  function resetForm() {
    setForm({ ...defaultForm, tradeDate: new Date().toISOString().slice(0, 16) });
  }

  const showQty = !["DIVIDEND", "FEE"].includes(form.side);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) resetForm();
      }}
    >
      <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Transaksi Portofolio</DialogTitle>
          <DialogDescription className="hidden sm:block">
            Catat transaksi beli, jual, dividen, atau transfer aset portofoliomu.
          </DialogDescription>
        </DialogHeader>

        <h3 className="text-xs font-medium text-muted-foreground tracking-wider">
          DETAIL TRANSAKSI
        </h3>

        <form onSubmit={handleSubmit} className="grid gap-3">
          {/* Pilih Aset */}
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Aset <span className="text-red-500">*</span>
            </label>
            <Select
              value={form.symbol}
              onValueChange={(v) => setForm((f) => ({ ...f, symbol: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih aset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.symbol} value={a.symbol}>
                    {a.symbol} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipe & Tanggal */}
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Tipe Transaksi <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.side}
                onValueChange={(v: PortfolioTradeSide) =>
                  setForm((f) => ({ ...f, side: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">{getSideLabel("BUY")}</SelectItem>
                  <SelectItem value="SELL">{getSideLabel("SELL")}</SelectItem>
                  <SelectItem value="TRANSFER_IN">{getSideLabel("TRANSFER_IN")}</SelectItem>
                  <SelectItem value="TRANSFER_OUT">{getSideLabel("TRANSFER_OUT")}</SelectItem>
                  <SelectItem value="DIVIDEND">{getSideLabel("DIVIDEND")}</SelectItem>
                  <SelectItem value="FEE">{getSideLabel("FEE")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={form.tradeDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tradeDate: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Quantity (conditional) */}
          {showQty && (
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Jumlah unit"
                value={form.quantity ? new Intl.NumberFormat('id-ID').format(Number(form.quantity)) : '0'}
                onChange={(e) => {
                  // Remove non-digits
                  const value = e.target.value.replace(/\D/g, '');
                  setForm(f => ({ ...f, quantity: value ? value : '0' }));
                }}
                required
              />
            </div>
          )}

          {/* Harga & Fee */}
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Harga per Unit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  placeholder="Opsional"
                  value={form.price ? new Intl.NumberFormat('id-ID').format(Number(form.price)) : '0'}
                  onChange={(e) => {
                    // Remove non-digits
                    const value = e.target.value.replace(/\D/g, '');
                    setForm(f => ({ ...f, price: value ? value : '0' }));
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Biaya (Fee)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  placeholder="0"
                  value={form.fee ? new Intl.NumberFormat('id-ID').format(Number(form.fee)) : '0'}
                  onChange={(e) => {
                    // Remove non-digits
                    const value = e.target.value.replace(/\D/g, '');
                    setForm(f => ({ ...f, fee: value ? value : '0' }));
                  }}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Catatan */}
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Catatan
            </label>
            <Input
              placeholder="Catatan transaksi (opsional)"
              value={form.note}
              onChange={(e) =>
                setForm((f) => ({ ...f, note: e.target.value }))
              }
            />
          </div>

          {/* Tombol aksi */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
