export const runtime = "nodejs";

import { and, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";

const ListQuery = z.object({
  q: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
const CreateBody = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["cash","bank","ewallet","investment"]).default("cash"),
  currency: z.string().length(3).default("IDR"),
  balance: z.number().nonnegative().default(0),
  note: z.string().max(200).optional().nullable(),
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
    p.q ? ilike(accounts.name, `%${p.q}%`) : undefined,
  ].filter(Boolean) as Parameters<typeof and>;

  const offset = (p.page - 1) * p.limit;

  const items = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      currency: accounts.currencyCode,
      // balance: sql<string>`${accounts.balanceAmount}::text`,
      // note: accounts.note,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(and(...where))
    .orderBy(accounts.createdAt)
    .limit(p.limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(accounts)
    .where(and(...where));

  return { items, page: p.page, limit: p.limit, total };
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
    // balance: String(body.balance),
    // note: body.note ?? null,
  }).returning({ id: accounts.id });

  return { id: row?.id };
});
