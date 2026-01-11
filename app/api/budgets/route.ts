export const runtime = "nodejs";

import { and, between, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { budgets, categories, transactions, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";
import { periodRange } from "@/lib/utils";

const ListQuery = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).nonempty(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const CreateBody = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  categoryId: z.uuid(),
  limitAmount: z.number().nonnegative(),
  carryover: z.boolean().optional(),
});

export const GET = handleApi(async (req: Request) => {
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

  const url = new URL(req.url);
  const p = ListQuery.parse(Object.fromEntries(url.searchParams));

  // Get start date of the period
  const startDate = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { startDatePeriod: true }
  });

  const startDatePeriod = Number(startDate?.startDatePeriod) || 1;
  const prev = prevPeriod(p.period);
  const { start: prevStart, end: prevEnd } = periodRange(prev, startDatePeriod);
  const { start, end } = periodRange(p.period, startDatePeriod);

  // build where clause
  const whereConditions = [
    eq(budgets.userId, userId),
    eq(budgets.periodMonth, p.period),
    p.search ? ilike(categories.name, `%${p.search}%`) : undefined,
  ].filter(Boolean);
  const where = whereConditions as NonNullable<typeof whereConditions[number]>[];

  const offset = (Number(p.page) - 1) * Number(p.limit);

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
    .where(and(...where))
    .orderBy(categories.name)
    .limit(Number(p.limit))
    .offset(offset);

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
  for (const r of prevSpentRows) prevSpentMap.set(r.categoryId ?? "null", Number(r.spent||0));

  // hitung spent per category (expense saja)
  const spentRows = await db
    .select({
      categoryId: transactions.categoryId,
      spent: sql<string>`SUM(${transactions.amount})::text`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, "expense"),
      between(transactions.occurredAt, start, end)
    ))
    .groupBy(transactions.categoryId);

  const spentMap = new Map<string, number>();
  for (const r of spentRows) spentMap.set(r.categoryId ?? "null", Number(r.spent || 0));

  // preload all previous budgets to avoid query per item
  const prevBudgets = await db.query.budgets.findMany({
    where: and(eq(budgets.userId, userId), eq(budgets.periodMonth, prev)),
    columns: { categoryId: true, amount: true, accumulatedCarryover: true }
  });
  
  const prevBudgetMap = new Map<string, { amount: number; accumulated: number }>();
  for (const pb of prevBudgets) {
    prevBudgetMap.set(pb.categoryId, {
      amount: Number(pb.amount || 0),
      accumulated: Number(pb.accumulatedCarryover || 0)
    });
  }

  const items = rows.map(r => {
    const limit = Number(r.limitAmount || 0);
    const accumulated = Number(r.accumulatedCarryover || 0);
    const spent = spentMap.get(r.categoryId ?? "null") || 0;

    const effectiveLimit = limit + accumulated;
    const remaining = effectiveLimit - spent;
    const progress = effectiveLimit > 0 ? spent / effectiveLimit : 0;
    return { 
      ...r,
      limit,
      spent,
      remaining,
      progress,
      effectiveLimit,
      accumulatedCarryover: accumulated,
      prevPeriod: prev
    };
  });

  const totalItems = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(budgets)
    .where(and(...where));
  
  const totalRows = await db
    .select({
      id: budgets.id,
      limitAmount: sql<string>`${budgets.amount}::text`,
      accumulatedCarryover: sql<string>`${budgets.accumulatedCarryover}::text`,
      categoryId: categories.id,
    })
    .from(budgets)
    .leftJoin(categories, eq(categories.id, budgets.categoryId))
    .where(and(...where))
    .orderBy(categories.name);

  const totalLimit = totalRows.reduce((s, i)=> s + Number(i.limitAmount || 0), 0);
  const totalEffectiveLimit = totalRows.reduce((s, i)=> s + Number(i.limitAmount || 0) + Number(i.accumulatedCarryover || 0), 0);
  const totalSpent = totalRows.reduce((s, i)=> s + (spentMap.get(i.categoryId ?? "null") || 0), 0);
  const totalAlmostOver = totalRows.reduce((s, i) => s + ((Number(i.limitAmount || 0) + Number(i.accumulatedCarryover || 0)) > 0 && (spentMap.get(i.categoryId ?? "null") || 0) / (Number(i.limitAmount || 0) + Number(i.accumulatedCarryover || 0)) >= 0.8 ? 1 : 0), 0);
  const totalOverBudget = totalRows.reduce((s, i) => s + ((Number(i.limitAmount || 0) + Number(i.accumulatedCarryover || 0)) > 0 && (spentMap.get(i.categoryId ?? "null") || 0) > (Number(i.limitAmount || 0) + Number(i.accumulatedCarryover || 0)) ? 1 : 0), 0);
  return {
    period: p.period,
    items,
    total: {
      total: totalItems[0]?.count || 0,
      limit: totalLimit,
      effectiveLimit: totalEffectiveLimit,
      spent: totalSpent,
      remaining: totalEffectiveLimit - totalSpent,
      almostOver: totalAlmostOver,
      overBudget: totalOverBudget,
      startDate: start,
      endDate: end
    }
  };
});

export const POST = handleApi(async (req: Request) => {
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

  const body = CreateBody.parse(await req.json());

  // validasi kepemilikan kategori
  const ownCat = await db.query.categories.findFirst({
    where: and(
      eq(categories.id, body.categoryId), eq(categories.userId, userId)
    ),
    columns: { id: true }
  });
  if (!ownCat) throw new BadRequestError("Kategori tidak valid.");

  // unik per user-category-period
  const dup = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.userId, userId),
      eq(budgets.categoryId, body.categoryId),
      eq(budgets.periodMonth, body.period)
    ),
    columns: { id: true }
  });
  if (dup) throw new BadRequestError("Budget untuk kategori & periode ini sudah ada.");

  // Calculate accumulated carryover if enabled
  let accumulatedCarryover = 0;
  
  if (body.carryover) {
    // Get start date of the period
    const startDate = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
      columns: { startDatePeriod: true }
    });

    const startDatePeriod = Number(startDate?.startDatePeriod) || 1;
    const prev = prevPeriod(body.period);
    const { start: prevStart, end: prevEnd } = periodRange(prev, startDatePeriod);
    
    // Get previous budget
    const prevBudget = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, userId),
        eq(budgets.categoryId, body.categoryId),
        eq(budgets.periodMonth, prev)
      ),
      columns: { amount: true, accumulatedCarryover: true }
    });
    
    if (prevBudget) {
      // Calculate previous month spent
      const prevSpentResult = await db.select({
        spent: sql<string>`SUM(${transactions.amount})::text`
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.categoryId, body.categoryId),
        eq(transactions.type, "expense"),
        between(transactions.occurredAt, prevStart, prevEnd)
      ));
      
      const prevSpent = Number(prevSpentResult[0]?.spent || 0);
      const prevLimit = Number(prevBudget.amount || 0);
      const prevAccumulated = Number(prevBudget.accumulatedCarryover || 0);
      
      // Total effective limit previous month
      const prevEffectiveLimit = prevLimit + prevAccumulated;
      
      // Remaining from previous month becomes new accumulated carryover
      accumulatedCarryover = prevEffectiveLimit - prevSpent;
    }
  }

  const [row] = await db.insert(budgets).values({
    userId,
    categoryId: body.categoryId,
    periodMonth: body.period,
    amount: String(body.limitAmount),
    carryover: body.carryover ?? false,
    accumulatedCarryover: String(accumulatedCarryover),
  }).returning({ id: budgets.id });

  return { id: row?.id };
});

function prevPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  const d = new Date(y, m - 2, 1);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
