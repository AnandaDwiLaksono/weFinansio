export const runtime = "nodejs";

import { and, eq, sql, gte, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { accounts, transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

// helper batas bulan berjalan (local TZ sederhana)
function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0);
  return { start, end };
}

export const GET = handleApi(async () => {
  const session = await getSession();

  let userId = session?.user.id;
  // fallback cari userId dari email (mungkin terjadi kalau session lama sebelum perubahan)
  if (!userId && session?.user?.email) {
    const u = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (u) userId = u.id;
  }

  if (!userId) throw new UnauthorizedError("Session: " + JSON.stringify(session));

  const { start, end } = monthRange();

  // ============= KPI bulan berjalan =============
  // income
  const [incomeRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount}::numeric ELSE 0 END), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, start),
        lt(transactions.occurredAt, end),
      )
    );

  // expense
  const [expenseRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount}::numeric ELSE 0 END), 0)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, start),
        lt(transactions.occurredAt, end),
      )
    );

  // net = income - expense
  const [netRow] = await db
    .select({
      total: sql<string>`
        (
          COALESCE(SUM(CASE WHEN ${transactions.type}='income' THEN ${transactions.amount}::numeric ELSE 0 END),0)
        - COALESCE(SUM(CASE WHEN ${transactions.type}='expense' THEN ${transactions.amount}::numeric ELSE 0 END),0)
        )::text
      `,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.occurredAt, start),
        lt(transactions.occurredAt, end),
      )
    );

  // ============= Saldo per akun (tanpa transfer) =============
  // Kalau belum ada kolom opening balance, saldo = sum(income) - sum(expense)
  const accountBalances = await db
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

  // ============= 10 transaksi terakhir (semua tipe, exclude transfer jika mau) =============
  const recent = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      note: transactions.note,
      occurredAt: transactions.occurredAt,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(sql`${transactions.occurredAt} DESC`)
    .limit(10);

  return {
    kpi: {
      monthIncome: incomeRow?.total ?? "0",
      monthExpense: expenseRow?.total ?? "0",
      monthNet: netRow?.total ?? "0",
      range: { start, end },
    },
    accounts: accountBalances,
    recent,
  };
});
