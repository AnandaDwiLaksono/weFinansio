export const runtime = "nodejs";

import { and, between, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { budgets, categories, transactions, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import { periodRange, currentPeriod, prevPeriod } from "@/lib/utils";

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
  const prev = prevPeriod(currPeriod);
  const { start: prevStart, end: prevEnd } = periodRange(prev, startDatePeriod);
  const { start, end } = periodRange(currPeriod, startDatePeriod);
  
  // ambil budget + kategori
  const rows = await db
    .select({
      id: budgets.id,
      period: budgets.periodMonth,
      limitAmount: sql<string>`${budgets.amount}::text`,
      carryover: budgets.carryover,
      accumulatedCarryover: sql<string>`${budgets.accumulatedCarryover}::text`,
      categoryId: categories.id,
      categoryName: categories.name
    })
    .from(budgets)
    .leftJoin(categories, eq(categories.id, budgets.categoryId))
    .where(
      and(eq(budgets.userId, userId), eq(budgets.periodMonth, currPeriod))
    )
    .orderBy(categories.name)

  // ambil SPENT bulan lalu per kategori
  const prevSpentRows = await db
    .select({
      categoryId: transactions.categoryId,
      spent: sql<string>`SUM(${transactions.amount})::text`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "expense"),
      between(transactions.occurredAt, prevStart, prevEnd)
    ))
    .groupBy(transactions.categoryId);

  const prevSpentMap = new Map<string, number>();
  for (const r of prevSpentRows)
    prevSpentMap.set(r.categoryId ?? "null", Number(r.spent||0));

  // total pengeluaran per kategori bulan ini
  const spentRows = await db
    .select({
      categoryId: transactions.categoryId,
      spent: sql<string>`SUM(${transactions.amount})::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        between(transactions.occurredAt, start, end)
      )
    )
    .groupBy(transactions.categoryId);

  const spentMap = new Map<string, number>();
  spentRows.forEach(
    r => spentMap.set(String(r.categoryId), Number(r.spent))
  );

  const data = rows.map(r => {
    const limit = Number(r.limitAmount || 0);
    const accumulated = Number(r.accumulatedCarryover || 0);
    const spent = spentMap.get(String(r.categoryId)) ?? 0;
    
    const effectiveLimit = limit + accumulated;
    const remaining = effectiveLimit - spent;
    const progress = effectiveLimit > 0 ? spent / effectiveLimit : 0;
    return {
      ...r,
      planned: effectiveLimit,
      spent,
      remain: remaining,
      pct: progress,
    };
  });

  return data;
});
