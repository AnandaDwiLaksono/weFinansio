export const runtime = "nodejs";

import { z } from "zod";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const Row = z.object({
  accountId: z.string().uuid(),
  date: z.string(),           // ISO / yyyy-mm-dd
  amount: z.number(),         // + kredit, - debit
  description: z.string().optional(),
});
const Body = z.object({ rows: z.array(Row).min(1), tolerance: z.number().nonnegative().default(0) });

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

  const p = Body.parse(await req.json());
  const tol = p.tolerance ?? 0;

  // Untuk setiap mutasi: cari transaksi user di accountId, tanggal ±1 hari, nominal dalam toleransi, belum cleared
  let matched = 0;
  for (const r of p.rows) {
    const d = new Date(r.date);
    const d0 = new Date(d); d0.setDate(d0.getDate()-1);
    const d1 = new Date(d); d1.setDate(d1.getDate()+1);

    const type = r.amount >= 0 ? "income" : "expense";
    const amt = Math.abs(r.amount);

    const candidate = await db
      .select({
        id: transactions.id, amount: sql<number>`${transactions.amount}::float`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, r.accountId),
        eq(transactions.type, type as "income" | "expense"),
        gte(transactions.occurredAt, d0.toISOString().split("T")[0]),
        lte(transactions.occurredAt, d1.toISOString().split("T")[0]),
        eq(transactions.cleared, false)
      ))
      .orderBy(desc(transactions.occurredAt))
      .limit(20);

    const hit = candidate.find(c => Math.abs(c.amount - amt) <= tol);
    if (hit) {
      await db.update(transactions).set({
        cleared: true,
        statementAt: d,
        note: sql`COALESCE(${transactions.note}, '') || ${" | stmt: " + (r.description ?? "")}`
      }).where(eq(transactions.id, hit.id));
      matched++;
    }
  }

  return { ok: true, matched };
});
