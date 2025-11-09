export const runtime = "nodejs";

import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { transactions, accounts, categories, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import { parseJson } from "@/lib/validate";

const ListQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(["date_desc","date_asc","amount_desc","amount_asc"]).default("date_desc"),
  q: z.string().optional(),
  type: z.enum(["income","expense"]).optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().optional(), // ISO
  dateTo: z.string().optional(),   // ISO (inclusive)
});

const CreateBody = z.object({
  occurredAt: z.string(),                // ISO
  amount: z.number().positive(),
  type: z.enum(["income","expense"]),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
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

  const where = [
    eq(transactions.userId, userId),
    p.type ? eq(transactions.type, p.type) : undefined,
    p.accountId ? eq(transactions.accountId, p.accountId) : undefined,
    p.categoryId ? eq(transactions.categoryId, p.categoryId) : undefined,
    p.dateFrom ? gte(transactions.occurredAt, new Date(p.dateFrom)) : undefined,
    p.dateTo ? lte(transactions.occurredAt, new Date(p.dateTo)) : undefined,
    p.q ? or(
      ilike(transactions.note, `%${p.q}%`),
      ilike(accounts.name, `%${p.q}%`),
      ilike(categories.name, `%${p.q}%`)
    ) : undefined,
  ].filter(Boolean);

  const order =
    p.sort === "date_asc" ? transactions.occurredAt :
    p.sort === "amount_desc" ? desc(transactions.amount) :
    p.sort === "amount_asc" ? transactions.amount :
    desc(transactions.occurredAt);

  const offset = (p.page - 1) * p.limit;

  const rows = await db
    .select({
      id: transactions.id,
      occurredAt: transactions.occurredAt,
      amount: sql<string>`${transactions.amount}::text`,
      type: transactions.type,
      notes: transactions.note,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      accountName: accounts.name,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
    })
    .from(transactions)
    .leftJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...where))
    .orderBy(order)
    .limit(p.limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(transactions)
    .leftJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...where));

  return { items: rows, page: p.page, limit: p.limit, total };
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

  const body = await parseJson(req, CreateBody);
  // validasi kepemilikan account/category
  const [acc] = await db.select({ id: accounts.id }).from(accounts)
    .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId))).limit(1);
  if (!acc) throw new BadRequestError("Akun tidak valid.");

  if (body.categoryId) {
    const [cat] = await db.select({ id: categories.id }).from(categories)
      .where(and(eq(categories.id, body.categoryId), eq(categories.userId, userId))).limit(1);
    if (!cat) throw new BadRequestError("Kategori tidak valid.");
  }

  const [row] = await db.insert(transactions).values({
    userId,
    occurredAt: new Date(body.occurredAt),
    amount: String(body.amount),
    type: body.type,
    accountId: body.accountId,
    categoryId: body.categoryId ?? null,
    note: body.notes ?? null,
  }).returning({ id: transactions.id });

  return { id: row?.id };
});
