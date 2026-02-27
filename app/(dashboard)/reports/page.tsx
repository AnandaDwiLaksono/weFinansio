"use client";

import { useState } from "react";
import { useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Download, BarChart2 } from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { keepPreviousData } from "@tanstack/react-query";
import { rupiah } from "@/lib/utils";

type OverviewRow = { period:string; income:number; expense:number; net:number };
type OverviewRes = { from:string; to:string; items:OverviewRow[] };
type CatRow = { categoryId:string|null; categoryName:string; categoryColor?:string|null; total:number };
type CatRes = { period:string; type:"income"|"expense"; items:CatRow[]; totalAbs:number };

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const cur = currentPeriod();
  const [from, setFrom] = useState(cur);
  const [to, setTo] = useState(cur);
  const [catType, setCatType] = useState<"income" | "expense">("expense");

  const { data: overview, isLoading: loadingOverview } = useApiQuery<OverviewRes>(
    ["reports-overview", from, to],
    () => api.get("/api/reports/overview?" + new URLSearchParams({ from, to })),
    { placeholderData: keepPreviousData }
  );

  const periodForCat = to; // pakai bulan "to" sebagai fokus
  const { data: byCat, isLoading: loadingCat } = useApiQuery<CatRes>(
    ["reports-bycat", periodForCat, catType],
    () => api.get("/api/reports/by-category?" + new URLSearchParams({ period: periodForCat, type: catType })),
    { placeholderData: keepPreviousData }
  );

  const rows = overview?.items ?? [];

  async function handleExport() {
    const fromDate = from + "-01";
    const [y, m] = to.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const toDate = `${to}-${String(lastDay).padStart(2, "0")}`;
    const qs = new URLSearchParams({ fromDate, toDate }).toString();
    window.location.href = `/api/reports/export?${qs}`;
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Laporan</h1>
          <p className="text-sm text-muted-foreground">
            Cashflow bulanan, breakdown kategori, dan export data.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* filter bar */}
      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dari bulan</label>
            <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sampai bulan</label>
            <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = currentPeriod();
                setFrom(now);
                setTo(now);
              }}
            >
              Reset ke bulan ini
            </Button>
            <Link href="/transactions" className="text-xs text-primary underline ml-auto">
              Lihat detail transaksi
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* row 1: cashflow + tabel ringkas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Cashflow Bulanan
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loadingOverview ? (
              <div className="text-sm text-muted-foreground">Memuat grafik…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada data di rentang ini.</div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={rows}>
                  <XAxis dataKey="period" />
                  <YAxis />
                  <RTooltip
                    formatter={(v: number | string) =>
                      new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(Number(v) || 0)
                    }
                  />
                  <Legend />
                  <Area type="monotone" dataKey="income" name="Pemasukan" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="expense" name="Pengeluaran" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="net" name="Bersih" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ringkasan Cashflow</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bulan</TableHead>
                  <TableHead className="text-right">Masuk</TableHead>
                  <TableHead className="text-right">Keluar</TableHead>
                  <TableHead className="text-right">Bersih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.period}>
                    <TableCell className="text-xs">{r.period}</TableCell>
                    <TableCell className="text-xs text-right">{rupiah(r.income)}</TableCell>
                    <TableCell className="text-xs text-right">{rupiah(r.expense)}</TableCell>
                    <TableCell
                      className={
                        "text-xs text-right " +
                        (r.net >= 0 ? "text-emerald-600" : "text-red-600")
                      }
                    >
                      {rupiah(r.net)}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-4 text-xs text-muted-foreground text-center">
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* row 2: category breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base">
              Distribusi {catType === "expense" ? "Pengeluaran" : "Pemasukan"} ({periodForCat})
            </CardTitle>
            <Select value={catType} onValueChange={(v: "income" | "expense") => setCatType(v)}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Pengeluaran</SelectItem>
                <SelectItem value="income">Pemasukan</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-72">
            {loadingCat ? (
              <div className="text-sm text-muted-foreground">Memuat data…</div>
            ) : !byCat || byCat.items.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada data di bulan ini.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byCat.items}
                    dataKey="total"
                    nameKey="categoryName"
                    innerRadius={60}
                    outerRadius={90}
                  >
                    {byCat.items.map((c, i) => (
                      <Cell key={c.categoryId ?? i} />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(v: number | string) => rupiah(Number(v))}
                    labelFormatter={(name) => name}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rincian per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">% dari total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(byCat?.items ?? []).map((c) => {
                  const totalAbs = byCat?.totalAbs ?? 0;
                  const pct = totalAbs > 0 ? (Math.abs(c.total) / totalAbs) * 100 : 0;
                  return (
                    <TableRow key={c.categoryId ?? c.categoryName}>
                      <TableCell className="text-xs">{c.categoryName}</TableCell>
                      <TableCell className="text-xs text-right">{rupiah(c.total)}</TableCell>
                      <TableCell className="text-xs text-right">
                        {pct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!byCat || byCat.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="p-4 text-xs text-muted-foreground text-center">
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
