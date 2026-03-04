"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useApiMutation, api } from "@/lib/react-query";
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

type AssetType = 
  | "stock"
  | "mutual_fund"
  | "bond"
  | "government_bond"
  | "fixed_deposit"
  | "savings_account"
  | "precious_metal"
  | "foreign_currency"
  | "crypto"
  | "other";

type NewAssetPayload = {
  symbol: string;
  name: string;
  type: AssetType;
  currency: string;
  description?: string;
  issuer?: string;
  isin?: string;
  source?: string;
  note?: string;
  coupon?: number;
  interestRate?: number;
  maturityDate?: string;
  minimumUnit?: number;
  decimals?: number;
};

export default function PortofolioAssetModal({
  asChild = false,
  children,
  type = "add",
  id = "",
  initial = {
    symbol: "",
    name: "",
    type: "stock" as AssetType,
    currency: "IDR",
    description: "",
    issuer: "",
    isin: "",
    source: "",
    note: "",
    coupon: undefined,
    interestRate: undefined,
    maturityDate: "",
    minimumUnit: 1,
    decimals: 8,
  },
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  type?: "add" | "edit";
  id?: string;
  initial?: {
    symbol: string;
    name: string;
    type: AssetType;
    currency: string;
    description?: string;
    issuer?: string;
    isin?: string;
    source?: string;
    note?: string;
    coupon?: number;
    interestRate?: number;
    maturityDate?: string;
    minimumUnit?: number;
    decimals?: number;
  };
}) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);

  const create = useApiMutation<{ id: string }, NewAssetPayload>(
    (payload) => api.post("/api/portfolio/assets", payload),
    {
      onSuccess: () => {
        toast.success("Aset ditambahkan");
        queryClient.invalidateQueries({ queryKey: ["portfolio-assets"] });
        setOpen(false);
      },
    },
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.symbol || !form.name) {
      return toast.error("Symbol & Nama wajib diisi");
    }

    // Validasi type-specific
    if ((form.type === "bond" || form.type === "government_bond") && !form.coupon) {
      return toast.error("Coupon rate wajib untuk obligasi");
    }
    if ((form.type === "fixed_deposit" || form.type === "savings_account") && !form.interestRate) {
      return toast.error("Interest rate wajib untuk deposito/savings");
    }

    // Clean payload: remove empty optional fields
    const payload: NewAssetPayload = {
      symbol: form.symbol,
      name: form.name,
      type: form.type,
      currency: form.currency,
      minimumUnit: form.minimumUnit || 1,
      decimals: form.decimals || 8,
    };
    if (form.description) payload.description = form.description;
    if (form.issuer) payload.issuer = form.issuer;
    if (form.isin) payload.isin = form.isin;
    if (form.source) payload.source = form.source;
    if (form.note) payload.note = form.note;
    if (form.coupon) payload.coupon = form.coupon;
    if (form.interestRate) payload.interestRate = form.interestRate;
    if (form.maturityDate) payload.maturityDate = form.maturityDate;

    if (type === "add") create.mutate(payload);
  }

  // Conditional rendering helpers
  const showCoupon = form.type === "bond" || form.type === "government_bond";
  const showInterestRate = form.type === "fixed_deposit" || form.type === "savings_account";
  const showMaturityDate = form.type === "bond" || form.type === "government_bond" || form.type === "fixed_deposit";
  const showIssuer = form.type === "bond" || form.type === "government_bond" || form.type === "mutual_fund";
  const showIsin = form.type === "bond" || form.type === "government_bond" || form.type === "mutual_fund";

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
            {type === "add" ? "Tambah" : "Edit"} Aset
          </DialogTitle>
          <DialogDescription className="hidden sm:block">
            {type === "add"
              ? "Tambahkan aset investasi ke portofolio"
              : "Perbarui informasi aset investasi"}
          </DialogDescription>
        </DialogHeader>
        <h3 className="text-xs font-medium text-muted-foreground tracking-wider">
          DETAIL ASET
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Simbol Aset <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: BBCA, BTC..."
              value={form.symbol}
              onChange={e => setForm(
                f => ({...f, symbol: e.target.value.toUpperCase()})
              )}
            />
          </div>
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nama Aset <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Contoh: Bank Central Asia, Bitcoin..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Tipe Aset <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.type}
                onValueChange={(v: AssetType) =>
                  setForm((f) => ({ ...f, type: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipe aset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Saham</SelectItem>
                  <SelectItem value="mutual_fund">Reksa Dana</SelectItem>
                  <SelectItem value="bond">Obligasi Korporat</SelectItem>
                  <SelectItem value="government_bond">SBN / Obligasi Negara</SelectItem>
                  <SelectItem value="fixed_deposit">Deposito</SelectItem>
                  <SelectItem value="savings_account">Savings Account</SelectItem>
                  <SelectItem value="precious_metal">Logam Mulia</SelectItem>
                  <SelectItem value="foreign_currency">Mata Uang Asing</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Mata Uang <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.currency}
                onValueChange={(v: string) =>
                  setForm((f) => ({ ...f, currency: v }))
                }
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

          {/* Conditional Fields berdasarkan tipe aset */}
          {(showCoupon || showInterestRate || showMaturityDate || showIssuer || showIsin) && (
            <>
              <h3 className="text-xs font-medium text-muted-foreground tracking-wider mt-2">
                INFORMASI SPESIFIK
              </h3>

              {showIssuer && (
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Penerbit/Issuer {showIssuer && form.type !== "mutual_fund" && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    placeholder="Contoh: Bank BCA, Pemerintah RI..."
                    value={form.issuer}
                    onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                  />
                </div>
              )}

              {showIsin && (
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    ISIN Code
                  </label>
                  <Input
                    placeholder="Contoh: ID1000123456"
                    value={form.isin}
                    onChange={(e) => setForm((f) => ({ ...f, isin: e.target.value.toUpperCase() }))}
                  />
                </div>
              )}

              {showCoupon && (
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Coupon Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="99.99"
                    placeholder="Contoh: 6.5"
                    value={form.coupon || ""}
                    onChange={(e) => setForm((f) => ({ ...f, coupon: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
              )}

              {showInterestRate && (
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Interest Rate (%) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="99.99"
                    placeholder="Contoh: 8.5"
                    value={form.interestRate || ""}
                    onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
              )}

              {showMaturityDate && (
                <div className="w-full space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tanggal Jatuh Tempo {form.type === "fixed_deposit" && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    type="date"
                    value={form.maturityDate}
                    onChange={(e) => setForm((f) => ({ ...f, maturityDate: e.target.value }))}
                  />
                </div>
              )}
            </>
          )}

          {/* Optional Fields */}
          <h3 className="text-xs font-medium text-muted-foreground tracking-wider mt-2">
            INFORMASI TAMBAHAN (OPSIONAL)
          </h3>

          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Sumber/Platform
            </label>
            <Input
              placeholder="Contoh: BNI Sekuritas, Binance, Tokocrypto..."
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            />
          </div>

          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Deskripsi
            </label>
            <Input
              placeholder="Deskripsi singkat aset..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Catatan
            </label>
            <Input
              placeholder="Catatan pribadi..."
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
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
