"use client"

import { useMemo, useState } from "react"
import { Download, BarChart2 } from "lucide-react"
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
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts"
import { keepPreviousData } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"

import { useApiQuery, api } from "@/lib/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { rupiah, cn, currentPeriod, prevPeriod } from "@/lib/utils"
import KPICard from "@/components/KPICard"
import { ReportsOverviewRes, ReportsByCategoryRes, SettingsRes, AccountRes, ReportsBudgetRes } from "@/lib/types"

/* Color palette for pie cells (fallback) */
const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
  "#ec4899", "#6366f1",
]

/* Content */
export default function ReportsContent() {
  const params = useSearchParams()
  const router = useRouter()

  const { data: user } = useApiQuery<SettingsRes>(
    ["settings"],
    () => api.get("/api/settings"),
    { placeholderData: keepPreviousData }
  )

  const startDate = Number(user?.settings.startDatePeriod ?? 1)

  const [type, setType] = useState<"income" | "expense">("expense")
  const [period, setPeriod] = useState(currentPeriod(startDate))
  const [accountId, setAccountId] = useState(params.get("accountId") || "all")

  // get 11 months left from current period
  const lastYearPeriod = useMemo(() => {
    const [y, m] = period.split("-").map(Number)
    const d = new Date(Date.UTC(y, m - 12, 1))

    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
  }, [period])

  /* Fetch accounts for filter dropdown */
  const { data: accounts } = useApiQuery<AccountRes>(
    ["acc-filter"],
    () => api.get("/api/accounts"),
    { staleTime: 60_000 }
  )

  const { data: overview, isLoading: loadingOverview } = useApiQuery<ReportsOverviewRes>(
    ["reports-overview", { period, accountId }],
    () => {
      const params = new URLSearchParams({ period, accountId })

      return api.get("/api/reports/overview?" + params.toString())
    },
    { placeholderData: keepPreviousData }
  )

  /* Category breakdown — scoped to period */
  const { data: byCat, isLoading: loadingCat } = useApiQuery<ReportsByCategoryRes>(
    ["reports-bycat", { period, type, accountId }],
    () => {
      const catParams = new URLSearchParams({ period, type, accountId })
      
      return api.get("/api/reports/by-category?" + catParams.toString())
    },
    { placeholderData: keepPreviousData }
  )

  /* Budget vs Actual (by category and period) */
  const { data: budgetData } = useApiQuery<ReportsBudgetRes[]>(
    ["reports-budgets", { period }],
    () => {
      const params = new URLSearchParams({ period })
      
      return api.get("/api/summaries/budgets?" + params.toString())
    },
    { placeholderData: keepPreviousData }
  )

  const rows = overview?.items ?? []

  /* KPI: current period vs previous period */
  const currentRow = rows.find((r) => r.period === period)
  const prevP = prevPeriod(period)
  const prevRow = rows.find((r) => r.period === prevP)

  /* Export */
  async function handleExport() {
    const p = new URLSearchParams({ period, accountId })
    
    window.location.href = `/api/reports/export?${p}`
  }

  return (
    <div className="space-y-4 w-full max-w-[calc(100dvw-2rem)] md:max-w-[calc(100dvw-3rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 items-center">
        <div>
          <h1 className="text-xl font-medium text-foreground">
            Cashflow bulanan, breakdown kategori, budget vs aktual, dan export data.
          </h1>
        </div>
        <div className="hidden md:block">
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 gap-3 shadow-lg">
        <CardHeader className="gap-2">
          <CardTitle className="font-medium flex justify-between items-center">
            Filter laporan
            <Button
              variant="outline"
              onClick={() => {
                setPeriod(currentPeriod(startDate))
                setAccountId("all")
              }}
            >
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Periode
              </label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Akun
              </label>
              <Select
                value={accountId}
                onValueChange={(v) => setAccountId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua akun</SelectItem>
                  {(accounts?.items ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer w-full"
              onClick={() => router.push("/transactions")}
            >
              Lihat Detail Transaksi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Pemasukan"
          value={rupiah(currentRow?.income || 0)}
          icon="ArrowDownLeft"
          color="#009966"
        >
          <DeltaBadge
            period={currentRow?.period || ""}
            current={currentRow?.income || 0}
            prev={prevRow?.income || 0}
          />
        </KPICard>
        <KPICard
          title="Total Pengeluaran"
          value={rupiah(currentRow?.expense || 0)}
          icon="ArrowUpRight"
          color="#ff3333"
        >
          <DeltaBadge
            period={currentRow?.period || ""}
            current={currentRow?.expense || 0}
            prev={prevRow?.expense || 0}
            invert
          />
        </KPICard>
        <KPICard
          title="Bersih (Net)"
          value={rupiah(currentRow?.net || 0)}
          icon={(currentRow && currentRow?.net >= 0) ? 'TrendingUp' : 'TrendingDown'}
          color={(currentRow && currentRow?.net >= 0) ? "#009966" : "#ff3333"}
        >
          <DeltaBadge
            period={currentRow?.period || ""}
            current={currentRow?.net || 0}
            prev={prevRow?.net || 0}
          />
        </KPICard>
        <KPICard
          title="Saving Rate"
          value={(currentRow && currentRow?.income > 0) ? `${((currentRow.net / currentRow.income) * 100).toFixed(1)}%` : "—"}
          icon="Wallet"
          color="#3b82f6"
        >
          <DeltaBadge
            period={currentRow?.period || ""}
            current={currentRow && currentRow?.income > 0 ? (currentRow.net / currentRow.income) * 100 : 0}
            prev={prevRow && prevRow?.income > 0 ? (prevRow.net / prevRow.income) * 100 : 0}
            type="percent"
          />
        </KPICard>
      </div>

      {/* Cashflow */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2 py-4 gap-3 shadow-lg">
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4" /> Cashflow Bulanan
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {lastYearPeriod} — {period}
            </span>
          </CardHeader>
          <CardContent className="h-full min-h-72">
            {loadingOverview ? (
              <div className="text-sm text-muted-foreground">
                Memuat grafik…
              </div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Belum ada data di rentang ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rows}>
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    type="number"
                    tickFormatter={(v) => rupiah(v)}
                    width={70}
                  />
                  <RTooltip
                    formatter={(v: number | string) =>
                      new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(Number(v) || 0)
                    }
                    contentStyle={{ color: "#0f172a", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Pemasukan"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Pengeluaran"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    name="Bersih"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-lg p-4 gap-2.5">
          <CardHeader className="gap-2">
            <CardTitle className="text-base font-semibold">
              Ringkasan Cashflow
            </CardTitle>
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
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="p-4 text-xs text-muted-foreground text-center"
                    >
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.period}>
                    <TableCell className="text-xs">{r.period}</TableCell>
                    <TableCell className="text-xs text-right text-emerald-600">
                      {rupiah(r.income)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-red-500">
                      {rupiah(r.expense)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-right font-medium",
                        r.net >= 0 ? "text-emerald-600" : "text-red-500"
                      )}
                    >
                      {rupiah(r.net)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart */}
        <Card className="py-4 gap-3 shadow-lg">
          <CardHeader className="pb-2 flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Distribusi {type === "expense" ? "Pengeluaran" : "Pemasukan"}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Periode: {period}
              </p>
            </div>
            <Select
              value={type}
              onValueChange={(v: "income" | "expense") => setType(v)}
            >
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
              <div className="text-sm text-muted-foreground">
                Memuat data…
              </div>
            ) : !byCat || byCat.items.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Belum ada data {type === "expense" ? "pengeluaran" : "pemasukan"} di periode ini.
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={byCat.items}
                    dataKey="total"
                    nameKey="categoryName"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {byCat.items.map((c, i) => (
                      <Cell
                        key={c.categoryId ?? i}
                        fill={c.categoryColor ?? CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(v: number | string) => rupiah(Number(v))}
                    labelFormatter={(name) => String(name)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-lg p-4 gap-2.5">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">
              Rincian per Kategori — {period}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Separator />
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!byCat || byCat.items.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="p-4 text-xs text-muted-foreground text-center"
                      >
                        Tidak ada data.
                      </TableCell>
                    </TableRow>
                  )}
                  {(byCat?.items ?? []).map((c) => {
                    const totalAbs = byCat?.totalAbs ?? 0
                    const pct = totalAbs > 0 ? (Math.abs(c.total) / totalAbs) * 100 : 0
                    return (
                      <TableRow key={c.categoryId}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{
                                backgroundColor:
                                  c.categoryColor ?? CHART_COLORS[0],
                              }}
                            />
                            {c.categoryName}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {rupiah(c.total)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-muted-foreground">
                          {pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual */}
      {budgetData && budgetData?.length > 0 && (
        <Card className="py-4 gap-3 shadow-lg">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">
              Budget vs Aktual — {period}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart */}
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart
                  data={budgetData}
                  layout="vertical"
                  margin={{ left: 10, right: 30 }}
                >
                  <XAxis type="number" tickFormatter={(v) => rupiah(v)} />
                  <YAxis
                    type="category"
                    dataKey="categoryName"
                    width={80}
                    tick={{ fontSize: 11 }}
                  />
                  <RTooltip
                    formatter={(v: number | string) => rupiah(Number(v))}
                    contentStyle={{ color: "#0f172a", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    x={0}
                    strokeWidth={1}
                  />
                  <Bar
                    dataKey="planned"
                    name="Budget"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="spent"
                    name="Aktual"
                    fill="#f59e0b"
                    fillOpacity={0.8}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <Separator className="my-4" />

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Aktual</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetData.map((item) => {
                  const budget = Number(item.planned)
                  const spent = Math.abs(Number(item.spent))
                  const pct = budget > 0 ? (spent / budget) * 100 : 0
                  const remaining = budget - spent
                  return (
                    <TableRow key={item.categoryId}>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.categoryColor ?? "#3b82f6" }}
                          />
                          {item.categoryName}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {rupiah(budget)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-xs text-right",
                          spent > budget ? "text-red-500 font-medium" : ""
                        )}
                      >
                        {rupiah(spent)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-xs text-right font-medium",
                          remaining >= 0 ? "text-emerald-600" : "text-red-500"
                        )}
                      >
                        {rupiah(remaining)}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <span
                          className={cn(
                            "font-medium",
                            pct > 100 ? "text-red-500" : pct > 80 ? "text-amber-500" : "text-muted-foreground"
                          )}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/* Sub-components */
function DeltaBadge({ period, current, prev, type, invert }: {
  period: string
  current: number
  prev: number
  type?: "currency" | "percent"
  invert?: boolean
}) {
  if (!period) return null

  const diff = current - prev
  const pct = prev !== 0 ? (diff / Math.abs(prev)) * 100 : 0
  const up = invert ? diff < 0 : diff >= 0
  const changeColor = up ? "text-emerald-600" : "text-red-500"

  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="flex items-center gap-1">
        <span className={cn("text-xs", changeColor)}>
          {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">
          ({type === "percent" ? `${Math.abs(diff).toFixed(1)}%` : rupiah(diff)})
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {prevPeriod(period)}: {type === "percent" ? `${Math.abs(prev).toFixed(1)}%` : rupiah(prev)}
      </p>
    </div>
  )
}
