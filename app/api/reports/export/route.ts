export const runtime = "nodejs"

import { and, between, eq, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { transactions, accounts, categories, users, userSettings } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { handleApi } from "@/lib/http"
import { UnauthorizedError } from "@/lib/errors"
import { periodRange } from "@/lib/utils"

const Q = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).nonempty(),
  accountId: z.string().default("all"),
})

export const GET = handleApi(async (req: Request) => {
  const session = await getSession()
  let userId = session?.user?.id
  // fallback by email (jaga-jaga)
  if (!userId && session?.user?.email) {
    const u = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    })

    if (u) userId = u.id
  }

  if (!userId) throw new UnauthorizedError("No user")

  const url = new URL(req.url)
  const p = Q.parse(Object.fromEntries(url.searchParams))
    
  // Get start date of the period
  const startDate = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { startDatePeriod: true }
  })

  const startDatePeriod = Number(startDate?.startDatePeriod) || 1
  const { start, end } = periodRange(p.period, startDatePeriod)

  // build where clause
  const filters = [
    eq(transactions.userId, userId),
    between(transactions.occurredAt, start, end),
    p.accountId && p.accountId !== "all" ? eq(transactions.accountId, p.accountId) : undefined,
  ].filter(Boolean)

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
    .where(and(...filters))
    .orderBy(transactions.occurredAt)

  const header = [
    "date",
    "type",
    "amount",
    "account",
    "category",
    "notes",
  ]
  const lines = [header.join(",")]

  for (const r of rows) {
    const line = [
      r.date,
      r.type,
      r.amount,
      (r.accountName ?? "").replace(/,/g, " "),
      (r.categoryName ?? "").replace(/,/g, " "),
      (r.notes ?? "").replace(/[\r\n,]/g, " "),
    ].join(",")
    lines.push(line)
  }
  
  const csv = lines.join("\n")

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wefinansio-report_${p.period}.csv"`,
    },
  })
})
