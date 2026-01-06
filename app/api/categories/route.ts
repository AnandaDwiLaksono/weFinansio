export const runtime = "nodejs";

import { and, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { categories, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";
import { arch } from "os";

const ListQuery = z.object({
  search: z.string().optional(),
  kind: z.enum(["all", "income", "expense"]).default("all"),
  archived: z.enum(["all", "true", "false"]).default("all"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(100),
});
const CreateBody = z.object({
  name: z.string().min(1).max(60),
  kind: z.enum(["income","expense"]),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).default("#3b82f6"),
  icon: z.string().max(40).default("Wallet"),
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

  const whereConditions = [
    eq(categories.userId, userId),
    p.search ? ilike(categories.name, `%${p.search}%`) : undefined,
    p.kind !== "all" ? eq(categories.kind, p.kind) : undefined,
    p.archived !== "all" ? eq(categories.archived, p.archived === "true") : undefined,
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
      archived: categories.archived,
      note: categories.note,
      createdAt: categories.createdAt,
    })
    .from(categories)
    .where(and(...where))
    .orderBy(categories.name)
    .limit(p.limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(categories)
    .where(and(...where));

  const totals = await db
    .select({
      id: categories.id,
      kind: categories.kind,
    })
    .from(categories)
    .where(and(...where, eq(categories.archived, p.archived === "true" ? true : false)));

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
    archived: body.archived,
    note: body.note,
  }).returning({ id: categories.id });

  return { id: row?.id };
});
