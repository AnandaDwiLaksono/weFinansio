export const runtime = "nodejs";

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, transactions, categories, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0);
  return { start, end };
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

  const { start, end } = monthRange();

  // income bulan ini
  const [inc] = await db
    .select({ total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} END), 0)::text` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, start), lt(transactions.occurredAt, end)));

  // expense bulan ini
  const [exp] = await db
    .select({ total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} END), 0)::text` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, start), lt(transactions.occurredAt, end)));

  // saldo akun (balance)
  const [bal] = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      currencyCode: accounts.currencyCode,
      balance: sql<string>`
        (
          COALESCE((
            SELECT SUM(CASE WHEN t.type='income' THEN t.amount::numeric
                            WHEN t.type='expense' THEN -t.amount::numeric
                            ELSE 0 END)
            FROM ${transactions} t
            WHERE t.user_id = ${accounts.userId} AND t.account_id = ${accounts.id}
          ),0)
        )::text
      `,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId));
    // .select({ total: sql<string>`COALESCE(SUM(${accounts.balance}), 0)::text` })
    // .from(accounts)
    // .where(eq(accounts.userId, userId));

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
    // balance: bal?.total ?? "0",
    balance: bal,
    recent,
  };
});
