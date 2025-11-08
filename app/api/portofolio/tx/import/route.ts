export const runtime = "nodejs";

import { z } from "zod";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { portfolioTx as ptx } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError, BadRequestError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

const Tx = z.object({
  assetSymbol: z.string().min(1),
  type: z.enum(["buy","sell","dividend","dividend_reinvest","fee","tax"]),
  quantity: z.number().nonnegative(),
  price: z.number().nonnegative(),
  occurredAt: z.string(), // ISO
  note: z.string().optional(),
  clientId: z.string().optional(),
});
const Payload = z.object({ rows: z.array(Tx).min(1) });

export const POST = handleApi( async (req: Request) => {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

  const body = await req.json();
  const parsed = Payload.safeParse(body);
  if (!parsed.success) throw new BadRequestError("Payload tidak valid", parsed.error.issues);

  // Map symbol->asset_id (buat sesuai skema kamu)
  // Di contoh ini diasumsikan sudah ada table assets_master & relasi symbol unik
  const symbols = [...new Set(parsed.data.rows.map(r => r.assetSymbol))];
  const symbolMap = new Map<string,string>();
  if (symbols.length) {
    const rows = await db.execute<{id:string; symbol:string}>(sql`
      SELECT id, symbol FROM assets_master WHERE symbol = ANY(${symbols})
    `);
    rows.rows.forEach(r => symbolMap.set(r.symbol, r.id));
  }

  const values = parsed.data.rows
    .filter(r => symbolMap.get(r.assetSymbol))
    .map(r => ({
      userId,
      symbol: r.assetSymbol,
      type: r.type.toUpperCase() as "BUY" | "SELL" | "DIVIDEND" | "INTEREST" | "FEE" | "ADJUST",
      qty: String(r.quantity),
      price: String(r.price),
      occurredAt: new Date(r.occurredAt),
      note: r.note ?? null,
      clientId: r.clientId ?? null,
    }));
  if (values.length === 0) return { inserted: 0 };

  await db.insert(ptx).values(values);
  
  return { inserted: values.length };
});
