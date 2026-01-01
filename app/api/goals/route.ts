export const runtime = "nodejs";

import { and, asc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { goals, goalContributions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";
import { parseJson } from "@/lib/validate";

const ListQuery = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  archived: z.enum(["all", "true", "false"]).default("all"),
});
const CreateBody = z.object({
  name: z.string().min(1).max(160),
  targetAmount: z.number().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  startAmount: z.number().nonnegative().default(0),
  linkedAccountId: z.string().uuid().optional().nullable(),
  archived: z.boolean().default(false),
  note: z.string().max(500).optional(),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).default("#3b82f6"),
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

  const p = ListQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const whereConditions = [
    eq(goals.userId, userId),
    p.search ? ilike(goals.name, `%${p.search}%`) : undefined,
    p.archived !== "all" ? eq(goals.archived, p.archived === "true") : undefined,
  ].filter(Boolean);
  const where = whereConditions as NonNullable<typeof whereConditions[number]>[];

  const offset = (p.page - 1) * p.limit;

  const rows = await db
    .select({
      id: goals.id,
      name: goals.name,
      targetAmount: sql<string>`${goals.targetAmount}::text`,
      targetDate: goals.targetDate,
      startAmount: sql<string>`${goals.startAmount}::text`,
      linkedAccountId: goals.linkedAccountId,
      createdAt: goals.createdAt,
      saved: sql<string>`
        COALESCE(${goals.startAmount}, 0)
        + COALESCE(SUM(${goalContributions.amount}), 0)
      `, // string
      color: goals.color,
      archived: goals.archived,
      note: goals.note,
    })
    .from(goals)
    .leftJoin(goalContributions, eq(goalContributions.goalId, goals.id))
    .where(and(...where))
    .groupBy(goals.id)
    .orderBy(asc(goals.createdAt))
    .limit(p.limit)
    .offset(offset);

  const items = rows.map(r => {
    const target = Number(r.targetAmount || 0);
    const saved = Number(r.saved || 0);
    const progress = target > 0 ? Math.min(1, saved / target) : 0;
    const remaining = Math.max(0, target - saved);
    return { ...r, target, saved, progress, remaining };
  });

  return { items };
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

  const [row] = await db.insert(goals).values({
    userId,
    name: body.name,
    targetAmount: body.targetAmount.toString(),
    targetDate: body.targetDate ?? null,
    startAmount: body.startAmount.toString(),
    linkedAccountId: body.linkedAccountId == "null" ? null : body.linkedAccountId,
    archived: body.archived,
    note: body.note ?? null,
    color: body.color,
  }).returning({ id: goals.id });

  return { id: row?.id };
});
