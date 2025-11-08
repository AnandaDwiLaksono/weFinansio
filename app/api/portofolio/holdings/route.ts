export const runtime = "nodejs";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import {
  assetsMaster as assets,
  holdings,
  assetPrices as prices,
  users,
} from "@/lib/db/schema";

const latestPriceSub = sql`
  SELECT DISTINCT ON (asset_id)
    asset_id, price, as_of
  FROM ${prices}
  ORDER BY asset_id, as_of DESC
`;

type Row = { assetId: string; symbol: string; name: string|null; qty: string; avgPrice: string|null; lastPrice: string|null };

export const GET = handleApi(async () => {
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

  const rows = await db.execute<Row>(sql`
    SELECT
      h.asset_id AS "assetId",
      a.symbol   AS "symbol",
      a.name     AS "name",
      (h.quantity)::text    AS "qty",
      (NULLIF(h.avg_price,0))::text AS "avgPrice",
      lp.price::text AS "lastPrice"
    FROM ${holdings} h
    JOIN ${assets} a ON a.id = h.asset_id
    LEFT JOIN (${latestPriceSub}) lp ON lp.asset_id = h.asset_id
    WHERE h.user_id = ${userId}
    ORDER BY a.symbol
  `);

  const items = rows.rows.map(r => {
    const qty  = Number(r.qty||0);
    const last = Number(r.lastPrice||0);
    const avg  = Number(r.avgPrice||0);
    const value = qty*last;
    const cost  = qty*avg;
    const pl = value - cost;
    const plPct = cost>0 ? pl/cost : 0;
    return {
      assetId: r.assetId,
      symbol: r.symbol,
      name: r.name ?? r.symbol,
      qty, lastPrice: last, avgPrice: avg,
      value, cost, pl, plPct,
    };
  });

  return items;
});
