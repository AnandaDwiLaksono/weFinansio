export const runtime = "nodejs"

import { and, between, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db"
import { transactions, users, userSettings } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { handleApi } from "@/lib/http"
import { UnauthorizedError } from "@/lib/errors"
import { periodRange, prevPeriod } from "@/lib/utils"

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
  let period = p.period
  
  const items = []
  for (let i = 0; i < 12; i++) {
    const { start, end } = periodRange(period, startDatePeriod)

    const filters = [
      eq(transactions.userId, userId),
      between(transactions.occurredAt, start, end),
      p.accountId && p.accountId !== "all" ? eq(transactions.accountId, p.accountId) : undefined,
    ].filter(Boolean)

    const rows = await db
      .select({
        income: sql<string>`SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END)::text`,
        expense: sql<string>`SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END)::text`,
      })
      .from(transactions)
      .where(and(...filters))

    const income = Number(rows[0].income || 0)
    const expense = Number(rows[0].expense || 0)
    const net = income - expense

    items.push({ period, income, expense, net })

    period = prevPeriod(period)
  }

  items.reverse() // reverse to have the oldest period first

  return { from: items[items.length - 1].period, to: items[0].period, items }
})
