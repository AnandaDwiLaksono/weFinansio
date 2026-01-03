export const runtime = "nodejs";

import { and, between, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const Q = z.object({
  from: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  to: z.string().regex(/^\d{4}-\d{2}$/),
});

function monthRange(period: string) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, 1).toISOString().split("T")[0];
  const end = new Date(y, m, 0).toISOString().split("T")[0];
  return { start, end };
}

export const GET = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

  const p = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const { start: fromStart } = monthRange(p.from);
  const { end: toEnd } = monthRange(p.to);

  // group by month string
  const rows = await db
    .select({
      period: sql<string>`to_char(${transactions.occurredAt}, 'YYYY-MM')`,
      income: sql<string>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END)::text`,
      expense: sql<string>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        between(transactions.occurredAt, fromStart, toEnd)
      )
    )
    .groupBy(sql`to_char(${transactions.occurredAt}, 'YYYY-MM')`)
    .orderBy(sql`period`);

  const items = rows.map((r) => {
    const income = Number(r.income || 0);
    const expense = Number(r.expense || 0);
    const net = income - expense;
    return { period: r.period, income, expense, net };
  });

  return { from: p.from, to: p.to, items };
});
