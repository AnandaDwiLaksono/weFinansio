export const runtime = "nodejs";

import { and, between, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions, accounts, categories } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const Q = z.object({
  fromDate: z.string().date(), // YYYY-MM-DD
  toDate: z.string().date(),
});

export const GET = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

  const p = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
  const from = new Date(p.fromDate + "T00:00:00Z");
  const to = new Date(p.toDate + "T23:59:59Z");

  const rows = await db
    .select({
      date: transactions.occurredAt,
      type: transactions.type,
      amount: sql<string>`${transactions.amount}::text`,
      accountName: accounts.name,
      categoryName: categories.name,
      notes: transactions.note,
    })
    .from(transactions)
    .leftJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(eq(transactions.userId, userId), between(transactions.occurredAt, from, to))
    )
    .orderBy(transactions.occurredAt);

  const header = [
    "date",
    "type",
    "amount",
    "account",
    "category",
    "notes",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const line = [
      r.date.toISOString(),
      r.type,
      r.amount,
      (r.accountName ?? "").replace(/,/g, " "),
      (r.categoryName ?? "").replace(/,/g, " "),
      (r.notes ?? "").replace(/[\r\n,]/g, " "),
    ].join(",");
    lines.push(line);
  }
  const csv = lines.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wefinansio-report_${p.fromDate}_${p.toDate}.csv"`,
    },
  });
});
