export const runtime = "nodejs";

import { and, eq, lte, asc } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { assetsMaster, portfolioTx, assetPrices, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const QuerySchema = z.object({
  assetId: z.string().min(1),
});

export const GET = handleApi(async (req: Request) => {
  const session = await getSession();
  let userId = session?.user?.id;
  if (!userId && session?.user?.email) {
    const u = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (u) userId = u.id;
  }

  if (!userId) throw new UnauthorizedError("No user");

  const url = new URL(req.url);
  const q = QuerySchema.parse(Object.fromEntries(url.searchParams));

  // Find asset master to get the symbol
  const asset = await db.query.assetsMaster.findFirst({
    where: and(eq(assetsMaster.id, q.assetId), eq(assetsMaster.userId, userId)),
  });
  if (!asset) throw new NotFoundError("Aset tidak ditemukan");

  // Fetch all transactions for this asset
  const txs = await db
    .select()
    .from(portfolioTx)
    .where(and(eq(portfolioTx.symbol, asset.symbol), eq(portfolioTx.userId, userId)))
    .orderBy(asc(portfolioTx.occurredAt));

  // Fetch daily prices for this asset
  const prices = await db
    .select()
    .from(assetPrices)
    .where(eq(assetPrices.symbol, asset.symbol));

  const priceMap = new Map<string, number>();
  for (const p of prices) {
    priceMap.set(p.day, Number(p.close || 0));
  }

  // Generate last 30 days
  const points: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    points.push({ date: dateStr, value: 0 });
  }

  // Calculate value for each day
  for (const point of points) {
    const pointDate = new Date(point.date + "T23:59:59Z"); // End of day

    // Calculate cumulative qty up to pointDate
    let qty = 0;
    let lastTxPrice = 0;

    for (const t of txs) {
      const txDate = new Date(t.occurredAt);
      if (txDate <= pointDate) {
        const qVal = Number(t.qty || 0);
        const pVal = Number(t.price || 0);

        if (t.type === "BUY" || t.type === "TRANSFER_IN") {
          qty += qVal;
          lastTxPrice = pVal || lastTxPrice;
        } else if (t.type === "SELL" || t.type === "TRANSFER_OUT") {
          qty -= qVal;
          lastTxPrice = pVal || lastTxPrice;
        }
      }
    }

    // Get price for this day
    let price = priceMap.get(point.date) ?? lastTxPrice;

    point.value = qty * price;
  }

  return { points };
});
