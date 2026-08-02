export const runtime = "nodejs"

import { and, between, eq, sql } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db"
import { transactions, categories, users, userSettings } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { handleApi } from "@/lib/http"
import { UnauthorizedError } from "@/lib/errors"
import { periodRange } from "@/lib/utils"

const Q = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).nonempty(),
  type: z.enum(["income", "expense"]).default("expense"),
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

  const filters = [
    eq(transactions.userId, userId),
    between(transactions.occurredAt, start, end),
    eq(transactions.type, p.type),
    p.accountId && p.accountId !== "all" ? eq(transactions.accountId, p.accountId) : undefined,
  ].filter(Boolean)

  const rows = await db.select({
    categoryId: categories.id,
    categoryName: categories.name,
    categoryColor: categories.color,
    categoryIcon: categories.icon,
    total: sql<string>`SUM(${transactions.amount})::text`,
  })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...filters))
    .groupBy(categories.id, categories.name, categories.color, categories.icon)

  const items = rows
    .map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? "(Tanpa kategori)",
      categoryColor: r.categoryColor,
      categoryIcon: r.categoryIcon,
      total: Number(r.total || 0),
    }))
    .filter((x) => x.total !== 0)
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const totalAbs = items.reduce((s, i) => s + Math.abs(i.total), 0)
  
  return { period: p.period, type: p.type, items, totalAbs }
})
