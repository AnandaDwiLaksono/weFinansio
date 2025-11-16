"use client";

import { useState } from "react";
import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import AddPortofolioAssetModal from "@/components/AddPortofolioAssetModal";
import AddPortofolioTradeModal from "@/components/AddPortofolioTradeModal";

type AssetRow = {
  id:string; symbol:string; name:string;
  type:"stock"|"crypto"|"fund"|"cash"|"other";
  currency:string;
  quantity:number; avgPrice:number; lastPrice:number;
  cost:number; marketValue:number; pnl:number;
};

type AssetsRes = { items: AssetRow[]; total:{marketValue:number; pnl:number} };

type Trade = {
  id: string;
  tradeDate: string;
  side: "buy" | "sell" | string;
  quantity: number;
  price: number;
};

type TradesRes = { items: Trade[] };

export default function PortfolioPage() {
  const [q, setQ] = useState("");
  const { data, refetch } = useApiQuery<AssetsRes>(
    ["portfolio-assets", q],
    () => api.get("/api/portfolio/assets?" + new URLSearchParams({ q })),
    { staleTime: 10_000 }
  );
  const assets = data?.items ?? [];
  const total = data?.total ?? { marketValue: 0, pnl: 0 };
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Pantau aset, transaksi, dan keuntungan/kerugian portofoliomu.
          </p>
        </div>
        <div className="flex gap-2">
          <AddPortofolioAssetModal onSaved={refetch} />
        </div>
      </div>

      {/* ringkasan */}
      <Card>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground">Nilai pasar total</div>
            <div className="text-lg font-semibold">{rupiah(total.marketValue)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">P/L total</div>
            <div className={"text-lg font-semibold " + (total.pnl >= 0 ? "text-emerald-600" : "text-red-600")}>
              {rupiah(total.pnl)}
            </div>
          </div>
          <div className="flex items-end justify-end">
            <AddPortofolioTradeModal onSaved={refetch} />
          </div>
        </CardContent>
      </Card>

      {/* layout 2 kolom: daftar aset + detail/sparkline */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1.5fr]">
        {/* tabel aset */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base">Daftar Aset</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-4 pb-3">
              <Input
                placeholder="Cari simbol atau nama aset…"
                value={q}
                onChange={(e)=> setQ(e.target.value)}
              />
            </div>
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aset</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg</TableHead>
                  <TableHead className="text-right">Last</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow
                    key={a.id}
                    className={selectedAssetId === a.id ? "bg-muted/40 cursor-pointer" : "cursor-pointer"}
                    onClick={() => setSelectedAssetId(a.id)}
                  >
                    <TableCell className="text-xs">
                      <div className="font-medium">{a.symbol}</div>
                      <div className="text-muted-foreground text-[11px] truncate">
                        {a.name} • {a.type} • {a.currency}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs">{formatQty(a.quantity)}</TableCell>
                    <TableCell className="text-right text-xs">{rupiah(a.avgPrice)}</TableCell>
                    <TableCell className="text-right text-xs">{rupiah(a.lastPrice)}</TableCell>
                    <TableCell className="text-right text-xs">{rupiah(a.marketValue)}</TableCell>
                    <TableCell
                      className={
                        "text-right text-xs " + (a.pnl >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {rupiah(a.pnl)}
                    </TableCell>
                  </TableRow>
                ))}
                {assets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-4 text-xs text-muted-foreground text-center">
                      Belum ada aset. Tambahkan dulu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* detail asset: sparkline + transaksi */}
        <PortfolioDetailPanel assetId={selectedAssetId} />
      </div>
    </div>
  );
}

function PortfolioDetailPanel({ assetId }: { assetId: string | null }) {
  const { data: tradesData } = useApiQuery<TradesRes>(
    ["portfolio-trades", assetId],
    () => api.get("/api/portfolio/trades?" + new URLSearchParams({ assetId: assetId || "" })),
    { enabled: !!assetId }
  );

  const { data: spark } = useApiQuery<{ points:{date:string; value:number}[] }>(
    ["portfolio-spark", assetId],
    () => api.get("/api/portfolio/holding-sparkline?" + new URLSearchParams({ assetId: assetId! })),
    { enabled: !!assetId }
  );

  if (!assetId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Pilih aset di daftar untuk melihat detail & grafik.
        </CardContent>
      </Card>
    );
  }

  const trades = tradesData?.items ?? [];
  const points = spark?.points ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Detail Aset</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-40">
          {points.length === 0 ? (
            <div className="text-xs text-muted-foreground">Belum ada histori nilai.</div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={points}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString("id-ID", { month: "short", day: "numeric" })}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number | string | (number | string)[] | null | undefined) => {
                    const val = Array.isArray(v) ? v[0] : v;
                    return rupiah(Number(val ?? 0));
                  }}
                  labelFormatter={(d: string | number) => new Date(d).toLocaleString("id-ID")}
                />
                <Line type="monotone" dataKey="value" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div>
          <div className="text-xs font-medium mb-1">Transaksi terbaru</div>
          <div className="max-h-52 overflow-auto border rounded">
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
                    <TableCell className="text-[11px]">{t.side}</TableCell>
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
                    <TableCell colSpan={4} className="text-xs text-muted-foreground text-center py-3">
                      Belum ada transaksi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function rupiah(n:number){
  return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);
}
function formatQty(n:number){
  if (Math.abs(n) >= 1) return n.toLocaleString("id-ID",{maximumFractionDigits:2});
  return n.toFixed(4);
}
