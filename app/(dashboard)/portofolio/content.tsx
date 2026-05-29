"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useApiQuery, api, useApiMutation } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import PortofolioTradeModal from "@/components/PortofolioTradeModal";
import { rupiah } from "@/lib/utils";
import PortofolioAssetModal from "@/components/PortofolioAssetModal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import KPICard from "@/components/KPICard";
import ConfirmationModal from "@/components/ConfirmationModal";

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
type AssetRow = {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  currencyCode: string;
  description: string;
  issuer: string;
  isin: string;
  source: string;
  note: string;
  coupon: number;
  interestRate: number;
  maturityDate: string;
  minimumUnit: number;
  decimals: number;
  quantity: number;
  avgPrice: number;
  lastPrice: number;
  cost: number;
  marketValue: number;
  pnl: number;
};
type AssetsRes = {
  items: AssetRow[];
  total: { marketValue: number; pnl: number };
  totalCount: number;
};
type Trade = {
  id: string;
  tradeDate: string;
  side: "buy" | "sell" | string;
  quantity: number;
  price: number;
};
type TradesRes = { items: Trade[] };

// Helper function to get Indonesian label for asset type
function getAssetTypeLabel(type: AssetType | "all"): string {
  const labels: Record<AssetType | "all", string> = {
    all: "Semua Tipe",
    stock: "Saham",
    mutual_fund: "Reksa Dana",
    bond: "Obligasi",
    government_bond: "SBN",
    fixed_deposit: "Deposito",
    savings_account: "Tabungan",
    precious_metal: "Logam Mulia",
    foreign_currency: "Valas",
    crypto: "Kripto",
    other: "Lainnya",
  };
  return labels[type] || type;
}

// Helper function to get color variant for asset type badge
function getAssetTypeBadgeVariant(type: AssetType): "default" | "secondary" | "outline" {
  const variants: Record<AssetType, "default" | "secondary" | "outline"> = {
    stock: "default",
    mutual_fund: "secondary",
    bond: "outline",
    government_bond: "outline",
    fixed_deposit: "secondary",
    savings_account: "secondary",
    precious_metal: "default",
    foreign_currency: "default",
    crypto: "default",
    other: "outline",
  };
  return variants[type] || "outline";
}

export default function PortfolioContent() {
  const queryClient = useQueryClient();
  const params = useSearchParams();

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(params.get("search") || "");
  const [search, setSearch] = useState(params.get("search") || "");
  const [type, setType] = useState<AssetType | "all">(
    (params.get("type") as AssetType | "all") || "all"
  );
  const [page, setPage] = useState(1);

  const limit = 20;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch assets
  const { data } = useApiQuery<AssetsRes>(
    ["portfolio-assets", { search, type, page, limit }],
    () => api.get("/api/portofolio/assets?" + new URLSearchParams({
      search,
      type,
      page: String(page),
      limit: String(limit),
     })),
    { placeholderData: keepPreviousData }
  );

  // Delete asset
  const delMut = useApiMutation<{ ok: true }, { id: string }>(
    ({ id }) => api.del(`/api/portofolio/assets/${id}`),
    {
      onSuccess: () => {
        toast.success("Aset berhasil dihapus");

        queryClient.invalidateQueries({ queryKey: ["portfolio-assets"] });
      },
      onError: (error: any) => {
        toast.error(error?.message || "Gagal menghapus aset");
      },
    }
  );

  const assets = data?.items ?? [];
  const total = data?.total ?? { marketValue: 0, pnl: 0 };
  const totalCount = data?.totalCount ?? assets.length;
  const pages = Math.max(1, Math.ceil(totalCount / limit));

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const costBasis = total.marketValue - total.pnl;
  const pnlPct = costBasis > 0 ? ((total.pnl / costBasis) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium mb-4 text-foreground">
            Pantau aset dan performa investasi portofoliomu
          </h1>
        </div>
        <div className="hidden md:flex gap-2">
          <PortofolioAssetModal asChild type="add">
            <Button size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Tambah Aset
            </Button>
          </PortofolioAssetModal>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Aset"
          value={String(totalCount)}
          icon="Layers"
          color="#2563eb"
        />
        <KPICard
          title="Nilai Pasar Total"
          value={rupiah(total.marketValue)}
          icon="Wallet"
          color="#7c3aed"
        />
        <KPICard
          title="P/L Total"
          value={rupiah(total.pnl)}
          icon="TrendingUp"
          color={total.pnl >= 0 ? "#16a34a" : "#dc2626"}
        >
          {total.pnl >= 0 ? "+" : ""}{pnlPct}% dari modal
        </KPICard>
        <KPICard
          title="Modal Terdistribusi"
          value={rupiah(costBasis)}
          icon="PiggyBank"
          color="#ea580c"
        />
      </section>

      {/* Filter Card */}
      <Card className="p-4 gap-3 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xs font-medium flex justify-between items-center">
            Filter portofolio
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setType("all");
                setPage(1);
              }}
            >
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Pencarian</label>
              <div className="relative">
                <Input
                  placeholder="Cari simbol atau nama aset…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pr-8"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipe Aset</label>
              <Select
                value={type}
                onValueChange={(val) => {
                  setType(val as AssetType | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="stock">Saham</SelectItem>
                  <SelectItem value="mutual_fund">Reksa Dana</SelectItem>
                  <SelectItem value="bond">Obligasi</SelectItem>
                  <SelectItem value="government_bond">SBN</SelectItem>
                  <SelectItem value="fixed_deposit">Deposito</SelectItem>
                  <SelectItem value="savings_account">Tabungan</SelectItem>
                  <SelectItem value="precious_metal">Logam Mulia</SelectItem>
                  <SelectItem value="foreign_currency">Valas</SelectItem>
                  <SelectItem value="crypto">Kripto</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="text-xs text-muted-foreground mb-1 block">Tambah Transaksi</label>
              <PortofolioTradeModal asChild type="add">
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Transaksi
                </Button>
              </PortofolioTradeModal>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop: Table + Detail Panel */}
      <div className="hidden md:grid grid-cols-1 gap-3">
        {/* Tabel Desktop */}
        <Card className="shadow-lg p-4 gap-2.5">
          <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold">Daftar Aset</CardTitle>
              <p className="text-xs text-muted-foreground">
                Kelola semua aset investasi portofoliomu di sini.
              </p>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-accent text-xs text-muted-foreground">
              {totalCount} aset
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead>Aset</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Last</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a, idx) => (
                  <TableRow
                    key={a.id}
                    className={
                      selectedAssetId === a.id
                        ? "bg-muted/40 cursor-pointer"
                        : "cursor-pointer hover:bg-muted/20"
                    }
                    onClick={() => setSelectedAssetId(a.id)}
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {String((page - 1) * limit + idx + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{a.symbol}</div>
                      <div className="text-muted-foreground text-xs truncate max-w-[180px]">
                        {a.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getAssetTypeBadgeVariant(a.type)} className="text-[10px]">
                        {getAssetTypeLabel(a.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {formatQty(a.quantity)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {rupiah(a.avgPrice)}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {rupiah(a.lastPrice)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold">
                      {rupiah(a.marketValue)}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right text-xs font-semibold " +
                        (a.pnl >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {rupiah(a.pnl)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-center gap-1.5 items-center" onClick={(e) => e.stopPropagation()}>
                        <PortofolioAssetModal
                          asChild
                          type ="edit"
                          id={a.id}
                          initial={{
                            symbol: a.symbol,
                            name: a.name,
                            type: a.type,
                            currency: a.currencyCode,
                            description: a.description,
                            issuer: a.issuer,
                            isin: a.isin,
                            source: a.source,
                            note: a.note,
                            coupon: a.coupon,
                            interestRate: a.interestRate,
                            maturityDate: a.maturityDate,
                            minimumUnit: a.minimumUnit,
                            decimals: a.decimals,
                          }}
                        >
                          <Button
                            variant="secondary"
                            size="icon"
                            aria-label="Edit"
                            className="h-7 w-7 rounded-full"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </PortofolioAssetModal>
                        <ConfirmationModal
                          title="Hapus Aset"
                          description={`Apakah Anda yakin ingin menghapus aset ini? Tindakan ini tidak dapat dibatalkan.`}
                          confirmText="Hapus"
                          cancelText="Batal"
                          onConfirm={() => delMut.mutate({ id: a.id })}
                          trigger={
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7 text-white rounded-full"
                              aria-label="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {assets.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="p-6 text-sm text-muted-foreground text-center"
                    >
                      {search || type !== "all"
                        ? "Tidak ada aset yang sesuai dengan filter."
                        : "Belum ada aset. Tambahkan dulu."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-1.5 border-t flex items-center justify-between text-xs text-muted-foreground">
              <div>
                Menampilkan {totalCount > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, totalCount)} dari {totalCount} aset
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card className="shadow-lg p-4 gap-3">
          <PortfolioDetailPanel assetId={selectedAssetId} symbol={selectedAsset?.symbol ?? null} />
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2 bg-card rounded-lg shadow-lg p-2.5 border border-card-foreground/10">
        <div className="flex justify-between items-center gap-2">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Daftar Aset
            </h2>
            <p className="text-xs text-muted-foreground">
              Kelola semua aset investasi portofoliomu di sini.
            </p>
          </div>
          <div className="px-1.5 py-0.5 rounded-full bg-accent text-xs text-muted-foreground whitespace-nowrap">
            {totalCount} aset
          </div>
        </div>
        {assets.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            {search || type !== "all"
              ? "Tidak ada aset yang sesuai dengan filter."
              : "Belum ada aset. Tambahkan dulu."}
          </div>
        )}
        {assets.map((a, idx) => (
          <Card
            key={a.id}
            className={`bg-secondary p-2 cursor-pointer ${selectedAssetId === a.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => setSelectedAssetId(a.id)}
          >
            <CardContent className="p-2 gap-1.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground font-mono">
                    {String((page - 1) * limit + idx + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {a.symbol}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {a.name}
                    </div>
                    <Badge variant={getAssetTypeBadgeVariant(a.type)} className="text-[10px] mt-1">
                      {getAssetTypeLabel(a.type)}
                    </Badge>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">
                      {rupiah(a.marketValue)}
                    </div>
                    <div
                      className={
                        "text-xs font-medium mt-0.5 " +
                        (a.pnl >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      P/L: {rupiah(a.pnl)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {a.currencyCode} · {formatQty(a.quantity)} unit
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Pagination mobile */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-sm text-muted-foreground">
              Total {totalCount} aset
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Detail Panel */}
      {selectedAssetId && (
        <div className="md:hidden">
          <Card className="shadow-lg">
            <PortfolioDetailPanel assetId={selectedAssetId} symbol={selectedAsset?.symbol ?? null} />
          </Card>
        </div>
      )}

      {/* FAB tambah aset (mobile) */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <PortofolioAssetModal asChild type="add">
          <Button
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Tambah aset"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </PortofolioAssetModal>
      </div>
    </div>
  );
}

function PortfolioDetailPanel({ assetId, symbol }: { assetId: string | null; symbol: string | null }) {
  const { data: tradesData } = useApiQuery<TradesRes>(
    ["portfolio-trades", symbol],
    () =>
      api.get(
        "/api/portofolio/trades?" +
          new URLSearchParams({ symbol: symbol || "" }),
      ),
    { enabled: !!symbol },
  );

  const { data: spark } = useApiQuery<{
    points: { date: string; value: number }[];
  }>(
    ["portfolio-spark", assetId],
    () =>
      api.get(
        "/api/portofolio/holding-sparkline?" +
          new URLSearchParams({ assetId: assetId! }),
      ),
    { enabled: !!assetId },
  );

  if (!assetId) {
    return (
      <>
        <CardHeader className="gap-3">
          <CardTitle className="text-base font-semibold">Detail Aset</CardTitle>
          <p className="text-xs text-muted-foreground">Pilih aset di daftar untuk melihat detail &amp; grafik.</p>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              Klik salah satu baris aset di tabel untuk menampilkan grafik nilai historis dan daftar transaksi terbaru di panel ini.
            </p>
          </div>
        </CardContent>
      </>
    );
  }

  const trades = tradesData?.items ?? [];
  const points = spark?.points ?? [];

  return (
    <>
      <CardHeader className="gap-3">
        <CardTitle className="text-base font-semibold">Detail Aset</CardTitle>
        <p className="text-xs text-muted-foreground">Grafik nilai &amp; transaksi terbaru.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sparkline Chart */}
        <div>
          <div className="text-xs font-medium mb-2">Grafik Nilai Historis</div>
          <div className="h-40">
            {points.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground bg-muted rounded-lg">
                Belum ada histori nilai.
              </div>
            ) : (
              <ResponsiveContainer>
                <LineChart data={points}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString("id-ID", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(
                      v: number | string | (number | string)[] | null | undefined,
                    ) => {
                      const val = Array.isArray(v) ? v[0] : v;
                      return rupiah(Number(val ?? 0));
                    }}
                    labelFormatter={(d: string | number) =>
                      new Date(d).toLocaleString("id-ID")
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    dot={false}
                    strokeWidth={1.5}
                    stroke="#2563eb"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <Separator />

        {/* Transaksi Terbaru */}
        <div>
          <div className="text-xs font-medium mb-2">Transaksi Terbaru</div>
          <div className="max-h-52 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-[11px]">
                      {new Date(t.tradeDate).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        t.side === "buy" ? "bg-green-100 text-green-800" :
                        t.side === "sell" ? "bg-red-100 text-red-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {t.side.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-right">
                      {formatQty(t.quantity)}
                    </TableCell>
                    <TableCell className="text-[11px] text-right">
                      {rupiah(t.price)}
                    </TableCell>
                  </TableRow>
                ))}
                {trades.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-xs text-muted-foreground text-center py-3"
                    >
                      Belum ada transaksi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </>
  );
}

function formatQty(n: number) {
  if (Math.abs(n) >= 1)
    return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  return n.toFixed(4);
}
