export const runtime = "nodejs";

import { and, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";

const ListQuery = z.object({
  q: z.string().optional(),
  kind: z.enum(["income","expense"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const CreateBody = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(["income","expense"]),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).default("#3b82f6"),
  icon: z.string().max(40).default("LuWallet"),
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
  const whereConditions = [
    eq(categories.userId, userId),
    p.kind ? eq(categories.kind, p.kind) : undefined,
    p.q ? ilike(categories.name, `%${p.q}%`) : undefined,
  ].filter(Boolean);
  const where = whereConditions as NonNullable<typeof whereConditions[number]>[];

  const offset = (p.page - 1) * p.limit;

  const items = await db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      color: categories.color,
      icon: categories.icon,
      usage: sql<number>`COALESCE( (SELECT COUNT(*) FROM ${transactions} t WHERE t.category_id = ${categories.id}), 0 )::int`,
      createdAt: categories.createdAt,
    })
    .from(categories)
    .where(and(...where))
    .orderBy(categories.createdAt)
    .limit(p.limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(categories)
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
  const hex = body.color.startsWith("#") ? body.color : `#${body.color}`;
  const dup = await db.query.categories.findFirst({
    where: and(eq(categories.userId, userId), eq(categories.name, body.name), eq(categories.kind, body.kind)),
    columns: { id: true }
  });
  if (dup) throw new BadRequestError("Kategori dengan nama & tipe ini sudah ada.");

  const [row] = await db.insert(categories).values({
    userId,
    name: body.name,
    kind: body.kind,
    color: hex,
    icon: body.icon,
  }).returning({ id: categories.id });

  return { id: row?.id };
});
