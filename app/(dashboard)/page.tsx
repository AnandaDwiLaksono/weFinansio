"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type SummaryRes = {
  incomeMonth: string;   // decimal string
  expenseMonth: string;
  balance: string;       // total saldo akun
  recent: Array<{
    id: string;
    occurredAt: string;  // ISO
    amount: string;      // signed
    accountName: string;
    categoryName: string | null;
    notes: string | null;
    type: "income" | "expense";
  }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();

  const { data, isLoading, error } = useApiQuery<SummaryRes>(
    ["summary"],
    () => api.get("/api/summary"),
    { enabled: status === "authenticated", staleTime: 30_000 }
  );

  if (status === "unauthenticated") {
    router.replace("/signin");
    return null;
  }
  if (status === "loading" || isLoading) return <LoadingState />;
  if (error || !data) return <div className="text-red-500">Gagal memuat data</div>;

  const income = rupiah(data.incomeMonth);
  const expense = rupiah(data.expenseMonth);
  const balance = rupiah(data.balance);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi title="Pemasukan (bulan ini)" value={income} trend="+">
          Sumber utama pemasukan bulan berjalan.
        </Kpi>
        <Kpi title="Pengeluaran (bulan ini)" value={expense} trend="-">
          Total spending bulan berjalan.
        </Kpi>
        <Kpi title="Total Saldo" value={balance} trend="">
          Akumulasi saldo seluruh akun.
        </Kpi>
      </section>

      {/* Recent transactions */}
      <section className="grid md:grid-cols-5 gap-4">
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Separator />
            <ul className="divide-y">
              {data.recent.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">Belum ada transaksi.</li>
              )}
              {data.recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {t.categoryName ?? (t.type === "income" ? "Pemasukan" : "Pengeluaran")}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {new Date(t.occurredAt).toLocaleString()} • {t.accountName}
                      {t.notes ? ` • ${t.notes}` : ""}
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : "-"} {rupiah(t.amount)}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Placeholder panel ringkas (bisa diisi budget/goals/portfolio ringkas) */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ringkasan Singkat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nantinya panel ini menampilkan progres budget/goals/portfolio secara ringkas.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function rupiah(n: string | number) {
  const v = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v || 0);
}

function Kpi({ title, value, trend, children }: { title: string; value: string; trend: string; children?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {children ? <p className="mt-1 text-xs text-muted-foreground">{children}</p> : null}
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
