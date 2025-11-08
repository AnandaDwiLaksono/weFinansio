export const runtime = "nodejs";

import { and, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

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

  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(end.getDate() - 29);

  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${transactions.occurredAt})::date`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} END), 0)::text`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} END), 0)::text`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, start), lt(transactions.occurredAt, new Date(end.getTime() + 86400000))))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  // normalisasi 30 hari
  const out: { date: string; income: number; expense: number; net: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = rows.find(r => r.day?.slice(0, 10) === key);
    const income = row ? Number(row.income) : 0;
    const expense = row ? Number(row.expense) : 0;
    out.push({ date: key, income, expense, net: income - expense });
  }
  return out;
});
