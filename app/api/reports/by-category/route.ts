export const runtime = "nodejs";

import { and, between, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions, categories } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const Q = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  type: z.enum(["income", "expense"]),
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
  const { start, end } = monthRange(p.period);

  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      total: sql<string>`SUM(${transactions.amount})::text`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, p.type),
        between(transactions.occurredAt, start, end)
      )
    )
    .groupBy(categories.id, categories.name, categories.color, categories.icon);

  const items = rows
    .map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? "(Tanpa kategori)",
      categoryColor: r.categoryColor,
      categoryIcon: r.categoryIcon,
      total: Number(r.total || 0),
    }))
    .filter((x) => x.total !== 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  const totalAbs = items.reduce((s, i) => s + Math.abs(i.total), 0);

  return { period: p.period, type: p.type, items, totalAbs };
});
