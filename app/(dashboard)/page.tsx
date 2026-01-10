"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

import { useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import BudgetPanel from "@/components/BudgetPanel";
import GoalsPanel from "@/components/GoalsPanel";
import Trend30Chart from "@/components/Trend30Chart";
import PortfolioPanel from "@/components/PortofolioPanel";
import { getIconByName } from "@/lib/icons";
import TransactionModal from "@/components/TransactionModal";
import { Button } from "@/components/ui/button";

type SummaryRes = {
  incomeMonth: string; // decimal string
  expenseMonth: string;
  balance: string; // total saldo akun
  recent: Array<{
    id: string;
    occurredAt: string; // ISO
    amount: string; // signed
    accountName: string;
    categoryName: string | null;
    notes: string | null;
    type: "income" | "expense";
  }>;
};

type GoalSummary = {
  id: string;
  name: string;
  target: number;
  saved: number;
  progress: number;
  remaining: number;
  targetDate?: string | null;
  color?: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();

  const { data, isLoading, error } = useApiQuery<SummaryRes>(
    ["summary"],
    () => api.get("/api/summaries"),
    { enabled: status === "authenticated", staleTime: 30_000 }
  );

  const { data: accounts } = useApiQuery<{
    items: { id: string; name: string }[];
  }>(["acc-filter"], () => api.get("/api/accounts"), { staleTime: 60_000 });

  const { data: categories } = useApiQuery<{
    items: { id: string; name: string; kind: "income" | "expense" }[];
  }>(["cat-filter"], () => api.get("/api/categories"), { staleTime: 60_000 });

  if (status === "unauthenticated") {
    router.replace("/signin");
    return null;
  }

  if (status === "loading" || isLoading) return <LoadingState />;
  if (error || !data)
    return <div className="text-red-500">Gagal memuat data</div>;

  const income = rupiah(data.incomeMonth);
  const expense = rupiah(data.expenseMonth);
  const balance = rupiah(data.balance);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          title="Pemasukan (bulan ini)"
          value={income}
          icon="ArrowDownLeft"
          color="green"
        >
          Sumber utama pemasukan bulan berjalan.
        </Kpi>
        <Kpi
          title="Pengeluaran (bulan ini)"
          value={expense}
          icon="ArrowUpRight"
          color="red"
        >
          Total spending bulan berjalan.
        </Kpi>
        <Kpi
          title="Total Saldo"
          value={balance}
          icon="Wallet"
          color="blue"
        >
          Akumulasi saldo seluruh akun.
        </Kpi>
      </section>

      <section className="grid md:grid-cols-5 gap-4">
        {/* Recent transactions */}
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Separator />
            <ul className="divide-y">
              {data.recent.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">
                  Belum ada transaksi.
                </li>
              )}
              {data.recent.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 p-3 md:p-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm md:text-base font-medium truncate">
                      {t.categoryName ??
                        (t.type === "income" ? "Pemasukan" : "Pengeluaran")}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {new Date(t.occurredAt).toLocaleString()} •{" "}
                      {t.accountName}
                      {t.notes ? ` • ${t.notes}` : ""}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 text-sm md:text-base font-semibold ${
                      t.type === "income" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"} {rupiah(t.amount)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Placeholder panel ringkas (bisa diisi budget/goals/portfolio ringkas) */}
        <div className="space-y-4 md:col-span-2">
          <PortfolioPanel />
          <BudgetPanel />
          <GoalsPanel />
          {/* <GoalsSummaryPanel /> */}
        </div>
      </section>

      {/* Grafik tren */}
      <Trend30Chart />

      {/* FAB tambah transaksi (mobile) */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <TransactionModal
          asChild
          type ="add"
          accounts={accounts?.items ?? []}
          categories={categories?.items ?? []}
          id=""
        >
          <Button className="h-12 w-12 rounded-full shadow-lg" aria-label="Tambah transaksi">
            <Plus className="h-5 w-5" />
          </Button>
        </TransactionModal>
      </div>
    </div>
  );
}

function rupiah(n: string | number) {
  const v = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function Kpi({
  title,
  value,
  icon,
  color,
  children,
}: {
  title: string;
  value: string;
  icon: "ArrowDownLeft" | "ArrowUpRight" | "Wallet";
  color: "green" | "red" | "blue";
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          {(() => {
            const Icon = getIconByName(icon);
            return (
              <span
                className="inline-flex items-center gap-1 rounded-lg text-xs font-medium p-2"
                style={{
                  backgroundColor: color === "green"
                    ? "rgba(16, 185, 129, 0.1)"
                    : color === "red"
                    ? "rgba(239, 68, 68, 0.1)"
                    : color === "blue"
                    ? "rgba(59, 130, 246, 0.1)"
                    : "rgba(15, 23, 42, 0.1)",
                  color: color || "#0f172a",
                }}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              </span>
            );
          })()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {children ? (
          <p className="mt-1 text-xs text-muted-foreground">{children}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

function GoalsSummaryPanel() {
  const {
    data: goalsData,
    isLoading: goalsLoading,
    error: goalsError,
  } = useApiQuery<{ items: GoalSummary[] }>(
    ["goals-dashboard"],
    () => api.get("/api/goals"),
    { staleTime: 30_000 }
  );

  const items = (goalsData?.items ?? [])
    .slice() // copy
    .sort((a, b) => (b.progress || 0) - (a.progress || 0))
    .slice(0, 3); // top 3

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Goals utama</CardTitle>
        <Link href="/goals" className="text-xs text-primary hover:underline">
          Lihat semua
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {goalsLoading && (
          <div className="text-xs text-muted-foreground">Memuat goals…</div>
        )}
        {!goalsLoading && items.length === 0 && (
          <div className="text-xs text-muted-foreground">
            Belum ada goal. Tambahkan dulu di menu Goals.
          </div>
        )}
        {items.map((g) => (
          <div key={g.id} className="flex items-center gap-3">
            <MiniRing progress={g.progress} color={g.color || "#3b82f6"} />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{g.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {rupiah(g.saved)} / {rupiah(g.target)} •{" "}
                {Math.round((g.progress || 0) * 100)}%
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniRing({ progress, color }: { progress: number; color: string }) {
  const pct = Math.round((progress || 0) * 100);
  return (
    <div className="relative h-10 w-10">
      <div
        className="h-10 w-10 rounded-full"
        style={{
          background: `conic-gradient(${color} ${pct}%, #e5e7eb ${pct}%)`,
        }}
      />
      <div className="absolute inset-[6px] bg-background rounded-full grid place-items-center">
        <span className="text-[10px] font-medium">{pct}%</span>
      </div>
    </div>
  );
}
