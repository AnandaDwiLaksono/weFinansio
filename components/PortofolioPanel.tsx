"use client"

import { useApiQuery, api } from "@/lib/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { rupiah, percentage } from "@/lib/utils"
import { SummariesPortofolioRes } from "@/lib/types"

export default function PortfolioPanel() {
  const { data, isLoading, error } = useApiQuery<SummariesPortofolioRes>(
    ["summaries-portofolio"],
    () => api.get("/api/summaries/portofolio"),
    { staleTime: 60_000 }
  )
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Portfolio</CardTitle>
      </CardHeader>
      {isLoading && (
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          Memuat…
        </CardContent>
      )}
      {error && (
        <CardContent className="text-sm text-red-500">
          Gagal memuat portfolio.
        </CardContent>
      )}
      {!isLoading && !error && data && (
        <CardContent className="space-y-4">
          {/* Total */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Nilai</div>
              <div className="font-semibold">{rupiah(data?.totalValue)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Modal</div>
              <div className="font-semibold">{rupiah(data?.totalCost)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">P/L</div>
              <div className={`font-semibold ${data?.totalPL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {sign(data?.totalPL)} {rupiah(Math.abs(data?.totalPL))} ({percentage(data?.totalPLPct)})
              </div>
            </div>
          </div>

          <Separator />

          {/* Top holdings */}
          <div className="space-y-2">
            {data?.top.length === 0 && (
              <div className="text-sm text-muted-foreground">Belum ada kepemilikan.</div>
            )}

            {data?.top.map(a => (
              <div key={a.assetId} className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{a.symbol}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.qty} • {rupiah(a.lastPrice)} • {a.name}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold">{rupiah(a.value)}</div>
                  <div className="text-xs">
                    <Badge variant={a.pl >= 0 ? "secondary" : "destructive"}>
                      {sign(a.pl)} {rupiah(Math.abs(a.pl))} ({percentage(a.plPct)})
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function sign(x: number) { return x >= 0 ? "+" : "-" }
