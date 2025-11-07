export const runtime = "nodejs";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  assetsMaster as assets,
  holdings,
  assetPrices as prices,
  portfolioTx as ptx,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

// helper: ambil harga terakhir per asset (Postgres)
const latestPriceSub = sql`
  SELECT DISTINCT ON (asset_id)
    asset_id,
    price,
    as_of
  FROM ${prices}
  ORDER BY asset_id, as_of DESC
`;

type Row = {
  assetId: string;
  symbol: string;
  name: string | null;
  qty: string;         // numeric text
  avgPrice: string | null;
  lastPrice: string | null;
};

export const GET = handleApi(async () => {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError("No user");

  // ====== Ambil holdings + harga terakhir
  const rows = await db.execute<Row>(sql`
    SELECT
      h.asset_id      AS "assetId",
      a.symbol        AS "symbol",
      a.name          AS "name",
      (h.quantity)::text AS "qty",
      ${sql`NULLIF(h.avg_price, 0)`}::text AS "avgPrice",
      lp.price::text  AS "lastPrice"
    FROM ${holdings} h
    JOIN ${assets} a ON a.id = h.asset_id
    LEFT JOIN (${latestPriceSub}) lp ON lp.asset_id = h.asset_id
    WHERE h.user_id = ${userId}
    ORDER BY a.symbol
  `);

  // ====== Jika avg_price kosong, fallback hitung dari transaksi tertimbang
  // (buy => +qty & +cost, sell => -qty & -cost proporsional)
  const needFallback = rows.rows.filter(r => !r.avgPrice);
  if (needFallback.length) {
    const ids = needFallback.map(r => r.assetId);
    if (ids.length) {
      type TxAgg = { assetId: string; qty: string; cost: string };
      const agg = await db.execute<TxAgg>(sql`
        SELECT
          t.asset_id AS "assetId",
          (COALESCE(SUM(CASE WHEN t.type IN ('buy','dividend_reinvest')
                             THEN t.quantity
                             WHEN t.type = 'sell' THEN -t.quantity
                             ELSE 0 END),0))::text AS "qty",
          (COALESCE(SUM(
            CASE
              WHEN t.type IN ('buy','dividend_reinvest') THEN t.quantity * t.price
              WHEN t.type = 'sell' THEN -t.quantity * (t.price)  -- pendekatan average
              ELSE 0
            END
          ),0))::text AS "cost"
        FROM ${ptx} t
        WHERE t.user_id = ${userId} AND t.asset_id = ANY(${ids})
        GROUP BY t.asset_id
      `);
      const map = new Map(agg.rows.map(a => [a.assetId, a]));
      rows.rows.forEach(r => {
        if (!r.avgPrice) {
          const a = map.get(r.assetId);
          if (a && Number(a.qty) !== 0) {
            const avg = Number(a.cost) / Number(a.qty);
            r.avgPrice = String(avg);
          } else {
            r.avgPrice = "0";
          }
        }
      });
    }
  }

  // ====== Hitung total & per-asset
  const items = rows.rows.map(r => {
    const qty = Number(r.qty || 0);
    const last = Number(r.lastPrice || 0);
    const avg  = Number(r.avgPrice || 0);
    const value = qty * last;
    const cost  = qty * avg;
    const pl = value - cost;
    const plPct = cost > 0 ? pl / cost : 0;
    return {
      assetId: r.assetId,
      symbol: r.symbol,
      name: r.name ?? r.symbol,
      qty,
      lastPrice: last,
      avgPrice: avg,
      value,
      cost,
      pl,
      plPct,
    };
  });

  const totalValue = items.reduce((s, x) => s + x.value, 0);
  const totalCost  = items.reduce((s, x) => s + x.cost, 0);
  const totalPL    = totalValue - totalCost;
  const totalPLPct = totalCost > 0 ? totalPL / totalCost : 0;

  // urutkan top by value
  items.sort((a, b) => b.value - a.value);

  return {
    totalValue,
    totalCost,
    totalPL,
    totalPLPct,
    top: items.slice(0, 6),
  };
});
