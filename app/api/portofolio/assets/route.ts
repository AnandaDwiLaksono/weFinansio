export const runtime = "nodejs";

import { eq, sql, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { assetsMaster, portfolioTx, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";
import { convertToBase, getFxMap, getUserBaseCurrency } from "@/lib/fx";

const Q = z.object({
  q: z.string().optional(),
});

const CreateBody = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["stock","crypto","mutual_fund","cash","other"]),
  currency: z.string().length(3),
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

  const base = await getUserBaseCurrency(userId);

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

  // FX map
  const ccys = filtered.map((a) => a.currency);
  const fxMap = await getFxMap(userId, ccys, base);

  const items = filtered.map((a) => {
    const pos = map.get(a.symbol) ?? { qty: 0, cost: 0, lastPrice: null };
    const quantity = pos.qty;
    const cost = pos.cost;
    const lastPrice = pos.lastPrice ?? 0;
    const rawMarketValue = quantity * lastPrice;
    const rawPnl = rawMarketValue - cost;
    const marketValue = convertToBase(rawMarketValue, a.currency, fxMap, base);
    const pnl = convertToBase(rawPnl, a.currency, fxMap, base);
    const avgPrice = quantity !== 0 ? cost / quantity : 0;
    return {
      ...a,
      quantity,
      cost,
      avgPrice,
      lastPrice,
      marketValue,
      pnl,
      baseCurrency: base,
    };
  });

  const totalMarketValue = items.reduce((s, i) => s + i.marketValue, 0);
  const totalPnl = items.reduce((s, i) => s + i.pnl, 0);

  return { baseCurrency: base, items, total: { marketValue: totalMarketValue, pnl: totalPnl } };
});

export const POST = handleApi(async (req: Request) => {
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

  const b = CreateBody.parse(await req.json());
  const [row] = await db.insert(assetsMaster).values({
    userId,
    symbol: b.symbol.toUpperCase(),
    name: b.name,
    type: b.type,
    currencyCode: b.currency.toUpperCase(),
  }).returning({ id: assetsMaster.symbol });

  return { id: row?.id };
});
