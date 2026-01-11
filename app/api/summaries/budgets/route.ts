export const runtime = "nodejs";

import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { budgets, categories, transactions, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import { periodRange, currentPeriod } from "@/lib/utils";

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
    
  // Get start date of the period
  const startDate = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { startDatePeriod: true }
  });
  
  const startDatePeriod = Number(startDate?.startDatePeriod) || 1;
  const currPeriod = currentPeriod(startDatePeriod);
  const { start, end } = periodRange(currPeriod, startDatePeriod);

  // total pengeluaran per kategori bulan ini
  const spentRows = await db
    .select({
      categoryId: transactions.categoryId,
      spent: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} END), 0)::text`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, start), lte(transactions.occurredAt, end)))
    .groupBy(transactions.categoryId);

  const spentMap = new Map<string, number>();
  spentRows.forEach(r => spentMap.set(String(r.categoryId), Number(r.spent)));

  // budget kategori bulan ini
  const rows = await db
    .select({
      categoryId: budgets.categoryId,
      categoryName: categories.name,
      amount: sql<string>`${budgets.amount}::text`,
    })
    .from(budgets)
    .leftJoin(categories, eq(categories.id, budgets.categoryId))
    .where(and(eq(budgets.userId, userId), eq(budgets.periodMonth, currPeriod)));

  const data = rows.map(r => {
    const planned = Number(r.amount ?? 0);
    const spent = spentMap.get(String(r.categoryId)) ?? 0;
    return {
      categoryId: r.categoryId!,
      categoryName: r.categoryName ?? "Tanpa kategori",
      planned,
      spent,
      remain: Math.max(planned - spent, 0),
      pct: planned > 0 ? Math.min(spent / planned, 1) : 0,
    };
  });

  return data.sort((a, b) => b.spent - a.spent).slice(0, 8);
});
