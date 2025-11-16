export const runtime = "nodejs";

import { and, eq, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { portfolioTx, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const Q = z.object({
  symbol: z.string().uuid(),
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

  const rows = await db
    .select({
      tradeDate: portfolioTx.occurredAt,
      side: portfolioTx.type,
      quantity: sql<string>`${portfolioTx.qty}::text`,
      price: sql<string>`${portfolioTx.price}::text`,
    })
    .from(portfolioTx)
    .where(and(eq(portfolioTx.userId, userId), eq(portfolioTx.symbol, p.symbol)))
    .orderBy(asc(portfolioTx.occurredAt));

  let qty = 0;
  let lastPrice = 0;
  const points: { date: string; value: number }[] = [];

  for (const r of rows) {
    const q = Number(r.quantity || 0);
    const price = Number(r.price || 0);
    if (r.side === "BUY" || r.side === "TRANSFER_IN") {
      qty += q;
      if (price > 0) lastPrice = price;
    } else if (r.side === "SELL" || r.side === "TRANSFER_OUT") {
      qty -= q;
      if (price > 0) lastPrice = price;
    }
    const val = qty * lastPrice;
    points.push({ date: r.tradeDate.toISOString(), value: val });
  }

  return { points };
});
