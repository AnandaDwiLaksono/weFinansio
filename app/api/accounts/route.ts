export const runtime = "nodejs";

import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";

const ListQuery = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(["all", "cash", "bank", "ewallet", "investment"]).default("all"),
  currency: z.enum(["all", "IDR", "USD", "EUR"]).default("all"),
  archived: z.enum(["all", "true", "false"]).default("all"),
});
const CreateBody = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["cash","bank","ewallet","investment"]).default("cash"),
  currency: z.string().length(3).default("IDR"),
  balance: z.number().nonnegative().default(0),
  archived: z.boolean().default(false),
  note: z.string().max(255).optional(),
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
    eq(accounts.userId, userId),
    p.search ? ilike(accounts.name, `%${p.search}%`) : undefined,
    p.type !== "all" ? eq(accounts.type, p.type) : undefined,
    p.currency !== "all" ? eq(accounts.currencyCode, p.currency) : undefined,
    p.archived !== "all" ? eq(accounts.archived, p.archived === "true") : undefined,
  ].filter(Boolean) as Parameters<typeof and>;

  const offset = (p.page - 1) * p.limit;

  const items = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currencyCode,
      balance: accounts.balance,
      archived: accounts.archived,
      note: accounts.note,
      updatedAt: accounts.updatedAt,
    })
    .from(accounts)
    .where(and(...where))
    .orderBy(asc(accounts.name))
    .limit(p.limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(accounts)
    .where(and(...where));

  const totals = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      balance: accounts.balance,
    })
    .from(accounts)
    .where(and(...where, eq(accounts.archived, p.archived === "true" ? true : false)))

  return { items, page: p.page, limit: p.limit, total, totals };
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
  // optional: cek duplikasi nama akun user
  const exists = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.name, body.name)),
    columns: { id: true }
  });
  if (exists) throw new BadRequestError("Nama akun sudah ada.");

  const [row] = await db.insert(accounts).values({
    userId,
    name: body.name,
    type: body.type,
    currencyCode: body.currency,
    balance: body.balance.toString(),
    archived: body.archived,
    note: body.note,
  }).returning({ id: accounts.id });

  return { id: row?.id };
});
