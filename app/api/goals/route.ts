export const runtime = "nodejs";

import { and, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { goals, goalContributions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";
import { parseJson } from "@/lib/validate";

const ListQuery = z.object({
  q: z.string().optional(),
});
const CreateBody = z.object({
  name: z.string().min(1).max(80),
  targetAmount: z.number().positive(),
  targetDate: z.string().date().optional().nullable(),
  startAmount: z.number().nonnegative().default(0),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(40).optional(),
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
    p.q ? ilike(goals.name, `%${p.q}%`) : undefined,
  ].filter(Boolean);
  const where = whereConditions as NonNullable<typeof whereConditions[number]>[];

  const rows = await db
    .select({
      id: goals.id,
      name: goals.name,
      targetAmount: sql<string>`${goals.targetAmount}::text`,
      targetDate: goals.targetDate,
      startAmount: sql<string>`${goals.startAmount}::text`,
      color: goals.color,
      icon: goals.icon,
      createdAt: goals.createdAt,
      saved: sql<string>`
        COALESCE(${goals.startAmount},0)
        + COALESCE((SELECT SUM(${goalContributions.amount}) FROM ${goalContributions} ge WHERE ge.goal_id = ${goals.id}),0)
      `, // string
    })
    .from(goals)
    .where(and(...where))
    .orderBy(goals.createdAt);

  const items = rows.map(r => {
    const target = Number(r.targetAmount||0);
    const saved = Number(r.saved||0);
    const progress = target>0 ? Math.min(1, saved/target) : 0;
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
  const color = body.color ? (body.color.startsWith("#") ? body.color : `#${body.color}`) : null;

  const [row] = await db.insert(goals).values({
    userId,
    name: body.name,
    targetAmount: body.targetAmount.toString(),
    targetDate: body.targetDate ? new Date(body.targetDate).toString() : null,
    startAmount: body.startAmount.toString(),
    color,
    icon: body.icon ?? null,
  }).returning({ id: goals.id });

  return { id: row?.id };
});
