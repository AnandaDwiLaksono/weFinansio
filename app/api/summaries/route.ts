export const runtime = "nodejs";

import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts, transactions, categories, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

function periodRange(period: string, startDate: number = 1) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, startDate + 1).toISOString().split('T')[0];
  const end = new Date(y, m, startDate).toISOString().split('T')[0];

  return { start, end };
}

function currentPeriod(startDate: number = 1) {
  const [y, m, d] = new Date().toISOString().split("T")[0].split("-").map(Number);
  if (d < startDate) {
    const prevMonth = m - 1 === 0 ? 12 : m - 1;
    const prevYear = prevMonth === 12 ? y - 1 : y;

    return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  } else {
    return `${y}-${String(m).padStart(2, "0")}`;
  }
}

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

  if (!userId) throw new UnauthorizedError("No user id in session.");
  
  // Get start date of the period
  const startDate = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { startDatePeriod: true }
  });

  const startDatePeriod = Number(startDate?.startDatePeriod) || 1;
  const currPeriod = currentPeriod(startDatePeriod);
  const { start, end } = periodRange(currPeriod, startDatePeriod);

  // income bulan ini
  const [inc] = await db
    .select({ total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} END), 0)::text` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, start), lte(transactions.occurredAt, end)));

  // expense bulan ini
  const [exp] = await db
    .select({ total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} END), 0)::text` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, start), lte(transactions.occurredAt, end)));

  // saldo akun (balance)
  const [bal] = await db
    .select({ total: sql<string>`COALESCE(SUM(${accounts.balance}), 0)::text` })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  // transaksi terbaru
  const recent = await db
    .select({
      id: transactions.id,
      occurredAt: transactions.occurredAt,
      amount: sql<string>`${transactions.amount}::text`,
      type: transactions.type,
      accountName: accounts.name,
      categoryName: categories.name,
      // notes: transactions.notes,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, userId))
    .orderBy(sql`occurred_at DESC`)
    .limit(8);

  return {
    incomeMonth: inc?.total ?? "0",
    expenseMonth: exp?.total ?? "0",
    balance: bal?.total ?? "0",
    recent,
  };
});
