export const runtime = "nodejs";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import {
  holdings,
  assetPrices as prices,
  users,
} from "@/lib/db/schema";

function day0(d: Date){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

export const GET = handleApi(async (req: Request) => {
  const session = await getSession();
    let userId = session?.user?.id;
    // fallback by email (jaga-jaga)
    if (!userId && session?.user?.email) {
      const u = await db.query.users.findFirst({
        where: eq(users.email, session.user.email),
        columns: { id: true },
      });
      if (u) userId = u.id;
    }
  
    if (!userId) throw new UnauthorizedError("No user");

  const url = new URL(req.url);
  const days = Math.max(7, Math.min(parseInt(url.searchParams.get("days") || "30"), 180));

  // holdings (qty & avg)
  const hRows = await db.execute<{assetId:string; qty:number; avg:number}>(sql`
    SELECT asset_id AS "assetId",
           SUM(quantity)::float AS qty,
           COALESCE(NULLIF(avg_price,0),0)::float AS avg
    FROM ${holdings}
    WHERE user_id = ${userId}
    GROUP BY asset_id, avg_price
  `);
  const hs = hRows.rows;
  if (hs.length === 0) return [];

  const end = day0(new Date());
  const start = new Date(end); start.setDate(end.getDate() - (days-1));

  // ambil harga harian per aset pada rentang (ambil harga terakhir per hari)
  const priceRows = await db.execute<{asOf:string; assetId:string; price:number}>(sql`
    WITH daily AS (
      SELECT DISTINCT ON (asset_id, date_trunc('day', as_of))
        asset_id,
        (date_trunc('day', as_of))::date AS as_of_day,
        price
      FROM ${prices}
      WHERE as_of >= ${start} AND as_of < ${new Date(end.getTime()+86400000)}
      ORDER BY asset_id, as_of_day, as_of DESC
    )
    SELECT as_of_day::text AS "asOf", asset_id AS "assetId", price::float AS price
    FROM daily
    ORDER BY as_of_day
  `);

  // susun map harga per hari
  const byDay = new Map<string, Map<string, number>>();
  for (const r of priceRows.rows) {
    const day = r.asOf.slice(0,10);
    if (!byDay.has(day)) byDay.set(day, new Map());
    byDay.get(day)!.set(r.assetId, r.price);
  }

  // untuk tiap hari, total value = sum(qty * lastPriceDay)
  const out: { date: string; value: number; cost: number; pl: number; plPct: number }[] = [];
  for (let i=0;i<days;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const day = d.toISOString().slice(0,10);
    const pricesMap = byDay.get(day) || new Map<string, number>();
    const value = hs.reduce((s,h)=> s + h.qty * (pricesMap.get(h.assetId) ?? 0), 0);
    const cost  = hs.reduce((s,h)=> s + h.qty * (h.avg ?? 0), 0);
    const pl = value - cost;
    out.push({ date: day, value, cost, pl, plPct: cost>0 ? pl/cost : 0 });
  }
  return out;
});
