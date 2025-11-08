"use client";

import { useMemo, useState } from "react";
import { useApiQuery, api } from "@/lib/react-query";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import Sparkline from "@/components/Sparkline";
import ImportPortfolioCsv from "@/components/TxImport";

type Holding = {
  assetId: string; symbol: string; name: string;
  qty: number; lastPrice: number; avgPrice: number;
  value: number; cost: number; pl: number; plPct: number;
};

export default function PortfolioPage() {
  const { data, isLoading, error } = useApiQuery<Holding[]>(
    ["holdings"], () => api.get("/api/portofolio/holdings"), { staleTime: 30_000 }
  );

  const [sort, setSort] = useState<{key:keyof Holding; dir: "asc"|"desc"}>({ key: "value", dir: "desc" });
  const items = useMemo(() => {
    const arr = [...(data ?? [])];
    arr.sort((a,b) => {
      const k = sort.key; const d = sort.dir === "asc" ? 1 : -1;
      return (a[k] as string | number) > (b[k] as string | number) ? d : -d;
    });
    return arr;
  }, [data, sort]);

  if (isLoading) return <div className="p-6">Memuat…</div>;
  if (error)     return <div className="p-6 text-red-500">Gagal memuat</div>;

  const totalValue = sum(items.map(x=>x.value));
  const totalPL    = sum(items.map(x=>x.pl));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Nilai: {rupiah(totalValue)} • P/L: <span className={totalPL>=0?"text-emerald-600":"text-red-600"}>{sign(totalPL)} {rupiah(Math.abs(totalPL))}</span></p>
        </div>
        <ImportPortfolioCsv />
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Holdings</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sortir: {label(sort.key)} ({sort.dir}) <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["value","pl","plPct","qty","symbol"] as (keyof Holding)[]).map(k=>(
                <DropdownMenuItem key={k} onClick={()=> setSort(s=>({ key:k, dir: s.key===k && s.dir==="desc" ? "asc":"desc" }))}>
                  {label(k)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aset</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Nilai</TableHead>
                <TableHead className="text-right">P/L</TableHead>
                <TableHead className="text-right">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((x)=>(
                <TableRow key={x.assetId}>
                  <TableCell>
                    <div className="font-medium">{x.symbol}</div>
                    <div className="text-xs text-muted-foreground">{x.name}</div>
                  </TableCell>
                  <TableCell className="text-right">{format(x.qty)}</TableCell>
                  <TableCell className="text-right">{rupiah(x.lastPrice)}</TableCell>
                  <TableCell className="text-right">{rupiah(x.value)}</TableCell>
                  <TableCell className={`text-right ${x.pl>=0?"text-emerald-600":"text-red-600"}`}>
                    {sign(x.pl)} {rupiah(Math.abs(x.pl))} ({Math.round((x.plPct||0)*100)}%)
                  </TableCell>
                  <TableCell className="text-right">
                    <Sparkline data={[]} />
                  </TableCell>
                </TableRow>
              ))}
              {items.length===0 && (
                <TableRow><TableCell colSpan={6} className="p-6 text-sm text-muted-foreground">Belum ada holdings.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grafik P/L harian total */}
      <PortfolioPLChart />
    </div>
  );
}

function PortfolioPLChart(){
  const { data, isLoading, error } = useApiQuery<{date:string; value:number; cost:number; pl:number; plPct:number}[]>(
    ["pl-daily"], () => api.get("/api/portfolio/pl-daily?days=90"), { staleTime: 60_000 }
  );
  if (isLoading) return <Card><CardHeader className="pb-2"><CardTitle className="text-base">P/L Harian (90 hari)</CardTitle></CardHeader><CardContent>Memuat…</CardContent></Card>;
  if (error) return <Card><CardHeader className="pb-2"><CardTitle className="text-base">P/L Harian (90 hari)</CardTitle></CardHeader><CardContent className="text-red-500">Gagal memuat</CardContent></Card>;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">P/L Harian (90 hari)</CardTitle></CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data ?? []} margin={{ left:8, right:8, top:8, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize:11 }} minTickGap={24} />
            <YAxis tickFormatter={(v:number)=>short(v)} width={60} />
            <Tooltip formatter={(v:number)=>rupiah(Number(v))} />
            <Area type="monotone" dataKey="value" fillOpacity={0.15} />
            <Area type="monotone" dataKey="pl" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function sum(a:number[]){ return a.reduce((s,x)=>s+x,0); }
function rupiah(n:number){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0); }
function format(n:number){ return new Intl.NumberFormat("id-ID").format(n||0); }
function short(n:number){ if(Math.abs(n)>=1_000_000) return `${Math.round(n/1_000_000)}jt`; if(Math.abs(n)>=1_000) return `${Math.round(n/1_000)}rb`; return String(n); }
function label(k:keyof Holding){
  switch(k){ case "value":return "Nilai"; case "pl":return "P/L"; case "plPct":return "P/L %"; case "qty":return "Qty"; case "symbol":return "Aset"; default:return String(k); }
}
function sign(x:number){ return x>=0?"+":"-"; }
