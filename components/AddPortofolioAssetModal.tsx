"use client";

import { useState } from "react";
import { useApiMutation, api } from "@/lib/react-query";
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

export default function AddPortofolioAssetModal({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  type NewAssetPayload = {
    symbol: string;
    name: string;
    type: "stock" | "crypto" | "fund" | "cash" | "other";
    currency: string;
  };
  type AssetType = NewAssetPayload["type"];
  
    const [form, setForm] = useState<NewAssetPayload>({
      symbol: "",
      name: "",
      type: "stock",
      currency: "IDR",
    });
  
    const mut = useApiMutation<{ id: string }, NewAssetPayload>(
      (payload) => api.post("/api/portfolio/assets", payload),
      {
        toastSuccess: "Aset ditambahkan",
        onSuccess: () => {
          setOpen(false);
          onSaved?.();
        },
      }
    );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol || !form.name) {
      return toast.error("Symbol & Nama wajib diisi");
    }
    mut.mutate(form);
  }

  function resetForm() {
    setForm({ symbol: "", name: "", type: "stock", currency: "IDR" });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Aset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Aset Portfolio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <Input
            placeholder="Symbol (mis: BBCA, BTC)"
            value={form.symbol}
            onChange={(e) =>
              setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))
            }
          />
          <Input
            placeholder="Nama aset"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.type}
              onValueChange={(v: AssetType) =>
                setForm((f) => ({ ...f, type: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipe aset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Saham</SelectItem>
                <SelectItem value="crypto">Kripto</SelectItem>
                <SelectItem value="fund">Reksa Dana</SelectItem>
                <SelectItem value="cash">Tunai</SelectItem>
                <SelectItem value="other">Lainnya</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={form.currency}
              onValueChange={(v: string) =>
                setForm((f) => ({ ...f, currency: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Mata uang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDR">IDR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
