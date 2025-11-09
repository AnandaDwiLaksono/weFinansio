export const runtime = "nodejs";

import { and, between, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgets, categories, transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";

const ListQuery = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).default(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }),
  kind: z.enum(["income","expense"]).optional(), // filter opsional
  q: z.string().optional(),
});

const CreateBody = z.object({
  categoryId: z.uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  limitAmount: z.number().nonnegative(),
  carryover: z.boolean().optional(),
});

function periodRange(period: string) {
  const [y,m] = period.split("-").map(Number);
  const start = new Date(y, m-1, 1, 0,0,0,0);
  const end   = new Date(y, m, 0, 23,59,59,999); // last day of month
  return { start, end };
}

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
  const prev = prevPeriod(p.period);
  const { start: prevStart, end: prevEnd } = periodRange(prev);
  const { start, end } = periodRange(p.period);

  const whereConditions = [
    eq(budgets.userId, userId),
    eq(budgets.periodMonth, p.period),
    p.kind ? eq(categories.kind, p.kind) : undefined,
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
      categoryId: categories.id,
      categoryName: categories.name,
      categoryKind: categories.kind,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
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
    columns: { categoryId: true, amount: true }
  });
  
  const prevBudgetMap = new Map<string, number>();
  for (const pb of prevBudgets) {
    prevBudgetMap.set(pb.categoryId, Number(pb.amount || 0));
  }

  const items = rows.map(r => {
    const limit = Number(r.limitAmount||0);
    const spent = spentMap.get(r.categoryId ?? "null") || 0;

    let carryAdd = 0;
    if (r.carryover) {
      const prevLimit = prevBudgetMap.get(r.categoryId ?? "null") || 0;
      const prevSpent = prevSpentMap.get(r.categoryId ?? "null") || 0;
      carryAdd = Math.max(0, prevLimit - prevSpent);
    }

    const effectiveLimit = limit + carryAdd;
    const remaining = Math.max(0, effectiveLimit - spent);
    const progress = effectiveLimit>0 ? Math.min(1, spent/effectiveLimit) : 0;
    return { ...r, limit, spent, remaining, progress, effectiveLimit, carryAdd, prevPeriod: prev };
  });

  // ringkasan total
  const totalLimit = items.reduce((s,i)=> s+i.limit, 0);
  const totalSpent = items.reduce((s,i)=> s+i.spent, 0);

  return { period: p.period, items, total: { limit: totalLimit, spent: totalSpent, remaining: Math.max(0,totalLimit-totalSpent) } };
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
    where: and(eq(categories.id, body.categoryId), eq(categories.userId, userId)),
    columns: { id: true, kind: true }
  });
  if (!ownCat) throw new BadRequestError("Kategori tidak valid.");

  // unik per user-category-period
  const dup = await db.query.budgets.findFirst({
    where: and(eq(budgets.userId, userId), eq(budgets.categoryId, body.categoryId), eq(budgets.periodMonth, body.period)),
    columns: { id: true }
  });
  if (dup) throw new BadRequestError("Budget untuk kategori & periode ini sudah ada.");

  const [row] = await db.insert(budgets).values({
    userId,
    categoryId: body.categoryId,
    periodMonth: body.period,
    amount: String(body.limitAmount),
    carryover: body.carryover ?? false,
  }).returning({ id: budgets.id });

  return { id: row?.id };
});

function prevPeriod(p: string) {
  const [y,m] = p.split("-").map(Number);
  const d = new Date(y, m-2, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
