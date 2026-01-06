export const runtime = "nodejs";

import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { transactions, accounts, categories, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import { parseJson } from "@/lib/validate";

const ListQuery = z.object({
  search: z.string().optional(),
  type: z.enum(["income", "expense", "transfer", "all"]).default("all"),
  accountId: z.string().default("all"),
  categoryId: z.string().default("all"),
  dateFrom: z.string().optional().nullable(), // ISO
  dateTo: z.string().optional().nullable(),   // ISO (inclusive)
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const CreateBody = z.object({
  occurredAt: z.string(),                // ISO
  amount: z.number().positive(),
  type: z.enum(["income", "expense", "transfer"]),
  accountId: z.uuid(),
  categoryId: z.uuid().nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
  transferToAccountId: z.uuid().nullable().optional(),
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
    p.search ? ilike(transactions.note, `%${p.search}%`) : undefined,
    p.type && p.type !== "all" ? eq(transactions.type, p.type) : undefined,
    p.accountId && p.accountId !== "all" ? eq(transactions.accountId, p.accountId) : undefined,
    p.categoryId && p.categoryId !== "all" ? eq(transactions.categoryId, p.categoryId) : undefined,
    p.dateFrom ? gte(transactions.occurredAt, p.dateFrom) : undefined,
    p.dateTo ? lte(transactions.occurredAt, p.dateTo) : undefined,
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
      transferToAccountId: transactions.transferToAccountId,
      transferToAccountName: sql<string>`(SELECT name FROM accounts WHERE id = ${transactions.transferToAccountId})`,
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

  // validasi kepemilikan account & category
  const [acc] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!acc) throw new BadRequestError("Akun tidak valid.");

  if (body.type === "transfer") {
    if (!body.transferToAccountId) {
      throw new BadRequestError("Akun tujuan transfer harus diisi.");
    }

    const [toAcc] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, body.transferToAccountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!toAcc) throw new BadRequestError("Akun tujuan transfer tidak valid.");
  }

  if (body.categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, body.categoryId), eq(categories.userId, userId)))
      .limit(1);
    if (!cat) throw new BadRequestError("Kategori tidak valid.");
  }

  // insert transaksi
  const [row] = await db.insert(transactions).values({
    userId,
    occurredAt: body.occurredAt,
    amount: String(body.amount),
    type: body.type,
    accountId: body.accountId,
    categoryId: body.categoryId ?? null,
    note: body.notes ?? null,
    transferToAccountId: body.transferToAccountId ?? null,
  }).returning({ id: transactions.id });

  // update account balance
  if (body.type === "transfer") {
    // transfer
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} - ${body.amount}`,
      })
      .where(eq(accounts.id, body.accountId));

    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${body.amount}`,
      })
      .where(eq(accounts.id, body.transferToAccountId!));
  } else if (body.type === "income") {
    // income
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} + ${body.amount}`,
      })
      .where(eq(accounts.id, body.accountId));
  } else if (body.type === "expense") {
    // expense
    await db
      .update(accounts)
      .set({
        balance: sql`${accounts.balance} - ${body.amount}`,
      })
      .where(eq(accounts.id, body.accountId));
  }

  return { id: row?.id };
});
