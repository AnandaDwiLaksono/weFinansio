export const runtime = "nodejs";

import { eq, sql, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { assetsMaster, portfolioTx, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const Q = z.object({
  q: z.string().optional(),
});

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

  const p = Q.parse(Object.fromEntries(new URL(req.url).searchParams));

  // Ambil semua trades per asset untuk hitung posisi & cost basis
  const trades = await db
    .select({
      assetId: portfolioTx.symbol,
      side: portfolioTx.type,
      quantity: sql<string>`${portfolioTx.qty}::text`,
      price: sql<string>`${portfolioTx.price}::text`,
      fee: sql<string>`${portfolioTx.fees}::text`,
    })
    .from(portfolioTx)
    .where(eq(portfolioTx.userId, userId));

  const map = new Map<
    string,
    { qty: number; cost: number; lastPrice: number | null }
  >();
  for (const t of trades) {
    const rec = map.get(t.assetId) ?? { qty: 0, cost: 0, lastPrice: null };
    const q = Number(t.quantity || 0);
    const price = Number(t.price || 0);
    const fee = Number(t.fee || 0);

    if (t.side === "BUY" || t.side === "TRANSFER_IN") {
      rec.qty += q;
      rec.cost += q * price + fee;
      rec.lastPrice = price || rec.lastPrice;
    } else if (t.side === "SELL" || t.side === "TRANSFER_OUT") {
      rec.qty -= q;
      rec.cost -= q * price - fee; // approx: kurangi cost (kasar)
      rec.lastPrice = price || rec.lastPrice;
    } else if (t.side === "DIVIDEND") {
      // tidak mengubah qty, hanya P&L kas. Untuk kesederhanaan sekarang diabaikan di nilai aset.
    } else if (t.side === "FEE") {
      rec.cost += fee;
    }
    map.set(t.assetId, rec);
  }

  const rows = await db
    .select({
      symbol: assetsMaster.symbol,
      name: assetsMaster.name,
      type: assetsMaster.type,
      currency: assetsMaster.currencyCode,
      createdAt: assetsMaster.createdAt,
    })
    .from(assetsMaster)
    .where(eq(assetsMaster.userId, userId))
    .orderBy(asc(assetsMaster.createdAt));

  const filtered = rows.filter((a) => {
    if (!p.q) return true;
    const q = p.q.toLowerCase();
    return (
      a.symbol.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
    );
  });

  const items = filtered.map((a) => {
    const pos = map.get(a.symbol) ?? { qty: 0, cost: 0, lastPrice: null };
    const quantity = pos.qty;
    const cost = pos.cost;
    const lastPrice = pos.lastPrice ?? 0;
    const marketValue = quantity * lastPrice;
    const pnl = marketValue - cost;
    const avgPrice = quantity !== 0 ? cost / quantity : 0;
    return {
      ...a,
      quantity,
      cost,
      avgPrice,
      lastPrice,
      marketValue,
      pnl,
    };
  });

  const totalMarketValue = items.reduce((s, i) => s + i.marketValue, 0);
  const totalPnl = items.reduce((s, i) => s + i.pnl, 0);

  return { items, total: { marketValue: totalMarketValue, pnl: totalPnl } };
});
