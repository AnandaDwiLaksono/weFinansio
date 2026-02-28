"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rupiah } from "@/lib/utils";

type Row = { date: string; income: number; expense: number; net: number };

export default function Trend30Chart() {
  const { data, isLoading, error } = useApiQuery<Row[]>(
    ["trend30d"],
    () => api.get("/api/summaries/analytics/trend30d"),
    { staleTime: 60_000 },
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Tren Arus Kas Periode Ini
        </CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {isLoading && (
          <div className="text-sm text-muted-foreground">Memuat…</div>
        )}
        {error && (
          <div className="text-sm text-red-500">Gagal memuat grafik.</div>
        )}
        {!isLoading && !error && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data ?? []}
              margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                minTickGap={24}
              />
              <YAxis tickFormatter={(v) => formatShort(v)} width={60} />
              <Tooltip
                formatter={(v: string | number) => rupiah(Number(v))}
              />
              <Area
                type="monotone"
                dataKey="income"
                fillOpacity={0.2}
                fill="#10b981"
              />
              <Area
                type="monotone"
                dataKey="expense"
                fillOpacity={0.2}
                fill="#ef4444"
              />
              <Area
                type="monotone"
                dataKey="net"
                fillOpacity={0.2}
                fill="#3b82f6"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function formatShort(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${Math.round(n / 1_000_000)}jt`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}
