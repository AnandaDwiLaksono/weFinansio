"use client";

import { useState } from "react";
import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type AssetOption = { id:string; symbol:string; name:string };

type PortfolioTradeSide =
  | "buy"
  | "sell"
  | "transfer_in"
  | "transfer_out"
  | "dividend"
  | "fee";

interface FormState {
  assetId: string;
  tradeDate: string;
  side: PortfolioTradeSide;
  quantity: string;
  price: string;
  fee: string;
  note: string;
}

type CreateTradePayload = {
  assetId: string;
  tradeDate: string; // ISO 8601 string
  side: PortfolioTradeSide;
  quantity: number;
  price: number;
  fee: number;
  note?: string;
};

export default function AddPortfolioTradeModal({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    assetId: "",
    tradeDate: new Date().toISOString().slice(0,16),
    side: "buy",
    quantity: "",
    price: "",
    fee: "0",
    note: "",
  });

  const { data: assetsRes } = useApiQuery<{items:AssetOption[]}>(
    ["portfolio-assets-options"],
    () => api.get("/api/portfolio/assets-options"),
    { staleTime: 60000 }
  );
  const assets = assetsRes?.items ?? [];

  const mut = useApiMutation<{ok:true}, CreateTradePayload>(
    (payload)=> api.post("/api/portfolio/trades", payload),
    {
      toastSuccess: "Transaksi portofolio disimpan",
      onSuccess: () => {
        onSaved?.();
        setOpen(false);
      }
    }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.assetId) return toast.error("Pilih aset");
    if (!form.quantity && !["dividend","fee"].includes(form.side)) {
      return toast.error("Quantity wajib diisi");
    }

    mut.mutate({
      assetId: form.assetId,
      tradeDate: new Date(form.tradeDate).toISOString(),
      side: form.side,
      quantity: ["dividend","fee"].includes(form.side) ? 0 : Number(form.quantity || 0),
      price: form.price ? Number(form.price) : 0,
      fee: form.fee ? Number(form.fee) : 0,
      note: form.note || undefined,
    });
  }

  function resetForm() {
    setForm({
      assetId: "",
      tradeDate: new Date().toISOString().slice(0,16),
      side: "buy",
      quantity: "",
      price: "",
      fee: "0",
      note: "",
    });
  }

  const showQty = !["dividend","fee"].includes(form.side);

  return (
    <Dialog
      open={open}
      onOpenChange={(v)=> {
        setOpen(v);
        if (v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Transaksi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Transaksi Portfolio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <Select
            value={form.assetId}
            onValueChange={(v)=> setForm(f=>({ ...f, assetId: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih aset" />
            </SelectTrigger>
            <SelectContent>
              {assets.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.symbol} — {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.side}
              onValueChange={(v:PortfolioTradeSide)=> setForm(f=>({ ...f, side: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
                <SelectItem value="transfer_in">Transfer in</SelectItem>
                <SelectItem value="transfer_out">Transfer out</SelectItem>
                <SelectItem value="dividend">Dividend</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="datetime-local"
              value={form.tradeDate}
              onChange={(e)=> setForm(f=>({ ...f, tradeDate: e.target.value }))}
            />
          </div>

          {showQty && (
            <Input
              placeholder="Quantity"
              value={form.quantity}
              onChange={(e)=> setForm(f=>({ ...f, quantity: e.target.value }))}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Harga per unit (opsional)"
              value={form.price}
              onChange={(e)=> setForm(f=>({ ...f, price: e.target.value }))}
            />
            <Input
              placeholder="Fee"
              value={form.fee}
              onChange={(e)=> setForm(f=>({ ...f, fee: e.target.value }))}
            />
          </div>

          <Input
            placeholder="Catatan (opsional)"
            value={form.note}
            onChange={(e)=> setForm(f=>({ ...f, note: e.target.value }))}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={()=> setOpen(false)}>
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
