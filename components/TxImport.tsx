"use client";

import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { useApiMutation, api } from "@/lib/react-query";
import { toast } from "sonner";

type Row = {
  assetSymbol: string;
  type: "buy"|"sell"|"dividend"|"dividend_reinvest"|"fee"|"tax";
  quantity: number;
  price: number;
  occurredAt: string; // ISO/date
  note?: string;
};

export default function ImportPortfolioCsv() {
  const mutation = useApiMutation<{inserted:number}, {rows: Row[]}>(
    (payload) => api.post("/api/portfolio/tx/import", payload),
    { toastSuccess: "Transaksi diimpor" }
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: (res) => {
        const rows = (res.data || []).map((r: Record<string, unknown>) => ({
          assetSymbol: String(r.assetSymbol || r.symbol || r.ticker).trim(),
          type: String(r.type).toLowerCase(),
          quantity: Number(r.quantity),
          price: Number(r.price),
          occurredAt: new Date(String(r.occurredAt || r.date)).toISOString(),
          note: r.note ? String(r.note) : undefined,
        })) as Row[];
        if (!rows.length) { toast.error("CSV kosong/format tidak dikenali"); return; }
        mutation.mutate({ rows });
        e.currentTarget.value = ""; // reset chooser
      },
      error: (err) => toast.error(`Gagal parse CSV: ${err.message}`),
    });
  }

  return (
    <div>
      <input id="csv" type="file" accept=".csv,text/csv" className="hidden" onChange={onPick} />
      <label htmlFor="csv">
        <Button asChild={false} variant="outline" size="sm">Impor CSV</Button>
      </label>
    </div>
  );
}
