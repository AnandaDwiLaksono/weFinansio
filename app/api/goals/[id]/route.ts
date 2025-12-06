export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { goals, goalContributions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  name: z.string().min(1).max(80).optional(),
  targetAmount: z.number().positive().optional(),
  targetDate: z.string().date().optional().nullable(),
  startAmount: z.number().nonnegative().optional(),
  linkedAccountId: z.string().uuid().optional().nullable(),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(40).optional(),
});

export const PATCH = handleApi(async (req: Request) => {
  const s = await getSession(); const userId = s?.user?.id;
  if (!userId) throw new UnauthorizedError();

  const id = req.url.split('/').pop()!;

  const own = await db.query.goals.findFirst({ where: and(eq(goals.id, id), eq(goals.userId, userId)) });
  if (!own) throw new NotFoundError("Goal tidak ditemukan.");

  const b = UpdateBody.parse(await req.json());
  await db.update(goals).set({
    name: b.name,
    targetAmount: typeof b.targetAmount === "number" ? String(b.targetAmount) : undefined,
    targetDate: b.targetDate === undefined ? undefined : (b.targetDate ?? null),
    startAmount: typeof b.startAmount === "number" ? String(b.startAmount) : undefined,
    linkedAccountId: b.linkedAccountId === undefined ? undefined : (b.linkedAccountId ?? null),
    color: b.color ? (b.color.startsWith("#") ? b.color : `#${b.color}`) : undefined,
    icon: b.icon,
  }).where(eq(goals.id, id));

  return { ok: true };
});

export const DELETE = handleApi(async (req: Request) => {
  const s = await getSession(); const userId = s?.user?.id;
  if (!userId) throw new UnauthorizedError();

  const id = req.url.split('/').pop()!;

  const own = await db.query.goals.findFirst({ where: and(eq(goals.id, id), eq(goals.userId, userId)), columns: { id:true } });
  if (!own) throw new NotFoundError("Goal tidak ditemukan.");

  await db.transaction(async (tx) => {
    await tx.delete(goalContributions).where(eq(goalContributions.goalId, id));
    await tx.delete(goals).where(eq(goals.id, id));
  });

  return { ok: true };
});
