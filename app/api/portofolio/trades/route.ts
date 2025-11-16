export const runtime = "nodejs";

import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { portfolioTx, assetsMaster, users, syncStatus } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";

const ListQuery = z.object({
  symbol: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(100),
});

const CreateBody = z.object({
  symbol: z.string(),
  tradeDate: z.string(), // ISO
  side: z.enum(["BUY","SELL","TRANSFER_IN","TRANSFER_OUT","DIVIDEND","FEE"]),
  quantity: z.number().nonnegative(),
  price: z.number().nonnegative().optional(),
  fee: z.number().nonnegative().optional(),
  note: z.string().max(200).optional(),
  syncStatus: z.enum(["pending","synced","failed"]),
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

  const p = ListQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const whereConditions = [
    eq(portfolioTx.userId, userId),
    p.symbol ? eq(portfolioTx.symbol, p.symbol) : undefined,
  ].filter(Boolean);
  const where = whereConditions as NonNullable<typeof whereConditions[number]>[];

  const rows = await db
    .select({
      id: portfolioTx.id,
      tradeDate: portfolioTx.occurredAt,
      side: portfolioTx.type,
      quantity: sql<string>`${portfolioTx.qty}::text`,
      price: sql<string>`${portfolioTx.price}::text`,
      fee: sql<string>`${portfolioTx.fees}::text`,
      note: portfolioTx.note,
      // assetId: portfolioTx.assetId,
      assetSymbol: assetsMaster.symbol,
      assetName: assetsMaster.name,
    })
    .from(portfolioTx)
    .leftJoin(assetsMaster, eq(assetsMaster.symbol, portfolioTx.symbol))
    .where(and(...where))
    .orderBy(desc(portfolioTx.occurredAt))
    .limit(p.limit);

  const items = rows.map((r) => ({
    ...r,
    quantity: Number(r.quantity || 0),
    price: Number(r.price || 0),
    fee: Number(r.fee || 0),
  }));

  return { items };
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
  if (b.side !== "DIVIDEND" && b.side !== "FEE" && b.quantity <= 0) {
    throw new BadRequestError("Quantity harus > 0 untuk transaksi buy/sell.");
  }

  // validasi asset milik user
  const asset = await db.query.assetsMaster.findFirst({
    where: and(eq(assetsMaster.symbol, b.symbol), eq(assetsMaster.userId, userId)),
    columns: { symbol: true },
  });
  if (!asset) throw new BadRequestError("Aset tidak valid.");

  await db.insert(portfolioTx).values({
    userId,
    symbol: b.symbol,
    occurredAt: new Date(b.tradeDate),
    type: b.side,
    qty: String(b.quantity),
    price: typeof b.price === "number" ? String(b.price) : undefined,
    fees: typeof b.fee === "number" ? String(b.fee) : "0",
    note: b.note ?? undefined,
    syncStatus: b.syncStatus,
  });

  return { ok: true };
});
