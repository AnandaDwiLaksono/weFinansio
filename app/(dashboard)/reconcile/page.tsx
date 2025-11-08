"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Row = {
  id: string; occurredAt: string; accountId: string; accountName: string|null;
  type: "income"|"expense"; amount: string; notes: string|null; cleared: boolean; reconciled: boolean;
};

type ImportRow = {
  accountId: string;
  date: string;
  amount: number;
  description: string;
};

type CsvRow = {
  date?: string;
  Date?: string;
  Tanggal?: string;
  amount?: string;
  Amount?: string;
  Nominal?: string;
  description?: string;
  Deskripsi?: string;
  Notes?: string;
};

export default function ReconcilePage(){
  const [accountId, setAccountId] = useState("");
  const [tolerance, setTol] = useState("0");

  const { data: accs } = useApiQuery<{items:{id:string; name:string}[]}>(
    ["acc-filter"], () => api.get("/api/accounts")
  );

  const { data, refetch } = useApiQuery<{items: Row[]}>(
    ["uncleared", accountId],
    () => api.get("/api/transactions?"+ new URLSearchParams({ page:"1", limit:"200", sort:"date_desc", accountId, })),
    { enabled: !!accountId }
  );

  const mark = useApiMutation<{ok:true},{ids:string[], cleared?:boolean; reconciled?:boolean}>(
    (payload)=> api.patch("/api/reconcile/mark", payload),
    { onSuccess: ()=> { toast.success("Status diperbarui"); refetch(); } }
  );

  const imp = useApiMutation<{ok:true, matched:number},{rows:ImportRow[], tolerance:number}>(
    (payload)=> api.post("/api/reconcile/import", payload),
    { onSuccess: (r)=> { toast.success(`Matched ${r.matched} transaksi`); refetch(); } }
  );

  function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if(!f) return;
    Papa.parse(f, {
      header:true, skipEmptyLines:true, complete: (res)=>{
        const rows = (res.data as CsvRow[]).map(r=>({
          accountId,
          date: r.date || r.Date || r.Tanggal,
          amount: Number(r.amount || r.Amount || r.Nominal),
          description: r.description || r.Deskripsi || r.Notes
        })).filter(x=> x.date && x.description && !Number.isNaN(x.amount)) as ImportRow[];
        imp.mutate({ rows, tolerance: Number(tolerance||0) });
      }, error: (err)=> toast.error(err.message)
    });
    e.currentTarget.value = "";
  }

  const items = (data?.items||[]).filter(x=> !x.cleared);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rekonsiliasi</h1>
          <p className="text-sm text-muted-foreground">Cocokkan transaksi buku dengan mutasi bank.</p>
        </div>
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1" value={accountId} onChange={(e)=>{ setAccountId(e.target.value); }}>
            <option value="">Pilih akun…</option>
            {(accs?.items ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Input placeholder="Tolerance (nominal)" value={tolerance} onChange={e=>setTol(e.target.value)} className="w-40" />
          <input id="csv" type="file" accept=".csv" className="hidden" onChange={onCsv} />
          <label htmlFor="csv"><Button variant="outline">Impor Mutasi CSV</Button></label>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Transaksi belum dicentang (cleared=false)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(t=>(
                <TableRow key={t.id}>
                  <TableCell>{new Date(t.occurredAt).toLocaleString("id-ID")}</TableCell>
                  <TableCell>{t.accountName}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{t.notes}</TableCell>
                  <TableCell className={`text-right ${t.type==="income"?"text-emerald-600":"text-red-600"} font-semibold`}>{format(t.amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={()=> mark.mutate({ ids:[t.id], cleared:true })}>Centang</Button>
                      <Button size="sm" variant="secondary" onClick={()=> mark.mutate({ ids:[t.id], reconciled:true })}>Reconcile</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {items.length===0 && (
                <TableRow><TableCell colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Semua transaksi sudah dicentang / pilih akun.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function format(n: string){ return new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0); }
