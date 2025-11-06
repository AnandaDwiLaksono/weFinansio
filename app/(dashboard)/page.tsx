"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useApiQuery, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AddTransactionModal from "@/components/AddTransactionModal"; // sudah kamu punya

type SummaryRes = {
  kpi: { monthIncome: string; monthExpense: string; monthNet: string; range: { start: string; end: string } };
  accounts: { id: string; name: string; currencyCode: string; balance: string }[];
  recent: { id: string; type: "income"|"expense"|"transfer"; amount: string; note: string|null; occurredAt: string; accountId: string; categoryId: string|null; }[];
};

function formatIDR(v: string | number) {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
}

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession(); // "loading" | "authenticated" | "unauthenticated"

  const { data, isLoading, error } = useApiQuery<SummaryRes>(
    ["summary"],
    () => api.get<SummaryRes>("/api/summary"),
    { enabled: status === "authenticated", staleTime: 30_000 },
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  const kpi = data?.kpi;
  const accounts = data?.accounts ?? [];
  const recent = data?.recent ?? [];

  const rangeLabel = useMemo(() => {
    if (!kpi) return "";
    const d = new Date(kpi.range.start);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  }, [kpi]);

  if (status === "loading") return <div className="p-6">Memuat sesi…</div>;
  if (isLoading && status === "authenticated") return <div className="p-6">Memuat dashboard…</div>;
  if (error) return <div className="p-6 text-red-500">Gagal memuat data</div>;

  return (
    <main className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Ringkasan {rangeLabel}</p>
        </div>
        <div className="flex gap-2">
          {/* Kamu bisa lempar data akun/kategori hasil fetch lain; untuk demo kosong */}
          <AddTransactionModal
            accounts={accounts.map(a => ({ id: a.id, name: a.name }))}
            categories={[]}
            userId={"session"} // nanti dari session server jika modal di server
          />
          <Button variant="outline">Export</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard title="Pemasukan (bulan ini)" value={formatIDR(kpi?.monthIncome || "0")} subtitle={rangeLabel} />
        <KpiCard title="Pengeluaran (bulan ini)" value={formatIDR(kpi?.monthExpense || "0")} subtitle={rangeLabel} />
        <KpiCard title="Bersih (bulan ini)" value={formatIDR(kpi?.monthNet || "0")} subtitle={rangeLabel} />
        <KpiCard title="Akun aktif" value={String(accounts.length)} subtitle="Total akun" />
      </section>

      {/* Accounts */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((a) => (
          <Card key={a.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Akun</div>
              <div className="font-medium">{a.name}</div>
              <div className="mt-2 text-2xl font-semibold">{formatIDR(a.balance)}</div>
              <div className="text-xs text-muted-foreground mt-1">{a.currencyCode}</div>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && (
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Belum ada akun. Tambahkan akun dahulu.</CardContent></Card>
        )}
      </section>

      {/* Recent Transactions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Transaksi Terbaru</h3>
              <a className="text-sm text-primary hover:underline" href="/transactions">Lihat semua</a>
            </div>
            <ul className="divide-y">
              {recent.map(tx => (
                <li key={tx.id} className="py-3 flex items-start justify-between">
                  <div className="pr-3">
                    <div className="text-sm font-medium">
                      {tx.type === "income" ? "Pemasukan" : tx.type === "expense" ? "Pengeluaran" : "Transfer"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tx.occurredAt).toLocaleString("id-ID")}
                    </div>
                    {tx.note && <div className="text-xs mt-1">{tx.note}</div>}
                  </div>
                  <div className={`text-sm font-semibold ${tx.type === "expense" ? "text-red-600" : tx.type === "income" ? "text-green-600" : ""}`}>
                    {tx.type === "expense" ? "-" : tx.type === "income" ? "+" : ""}{formatIDR(tx.amount)}
                  </div>
                </li>
              ))}
              {recent.length === 0 && (
                <li className="py-6 text-sm text-muted-foreground">Belum ada transaksi.</li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Placeholder: area chart / budget progress bisa ditempatkan di panel kanan */}
        <Card className="shadow-sm min-h-[200px]">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Progress Anggaran (placeholder)</h3>
            <div className="text-sm text-muted-foreground">
              (Nanti isi dengan chart Ringkasan Budget per kategori)
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
