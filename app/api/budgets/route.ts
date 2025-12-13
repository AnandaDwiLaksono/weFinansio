export const runtime = "nodejs";

import { and, between, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { budgets, categories, transactions, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";
import { effect } from "zod/v3";

const ListQuery = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).nonempty(),
  q: z.string().optional(),
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

  const whereConditions = [
    eq(budgets.userId, userId),
    eq(budgets.periodMonth, p.period),
    p.q ? ilike(categories.name, `%${p.q}%`) : undefined,
  ].filter(Boolean);
  const where = whereConditions as NonNullable<typeof whereConditions[number]>[];

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
    .orderBy(categories.name);

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
  for (const r of spentRows) spentMap.set(r.categoryId ?? "null", Number(r.spent||0));

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
    const limit = Number(r.limitAmount||0);
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

  // ringkasan total
  const totalLimit = items.reduce((s, i)=> s + i.limit, 0);
  const totalEffectiveLimit = items.reduce((s, i)=> s + i.effectiveLimit, 0);
  const totalSpent = items.reduce((s, i)=> s + i.spent, 0);
  const totalAlmostOver = items.reduce((s, i) => s + (i.effectiveLimit > 0 && i.progress >= 0.8 ? 1 : 0), 0);
  const totalOverBudget = items.reduce((s, i) => s + (i.effectiveLimit > 0 && i.spent > i.effectiveLimit ? 1 : 0), 0);

  return {
    period: p.period,
    items,
    total: {
      limit: totalLimit,
      effectiveLimit: totalEffectiveLimit,
      spent: totalSpent,
      remaining: totalEffectiveLimit - totalSpent,
      almostOver: totalAlmostOver,
      overBudget: totalOverBudget,
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

function periodRange(period: string, startDate: number = 1) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, startDate, 0, 0, 0, 0);
  const end   = new Date(y, m, startDate - 1, 23, 59, 59, 999); // last day of month

  return { start, end };
}
