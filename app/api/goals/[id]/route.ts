export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { goals, goalContributions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  name: z.string().min(1).max(160),
  targetAmount: z.number().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  startAmount: z.number().nonnegative().default(0),
  linkedAccountId: z.string().optional().nullable(),
  archived: z.boolean().default(false),
  note: z.string().max(500).optional(),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).default("#3b82f6"),
});

export const PATCH = handleApi(async (req: Request) => {
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

  const id = req.url.split('/').pop()!;

  const own = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, userId)),
    columns: { id: true }
  });
  if (!own) throw new NotFoundError("Goal tidak ditemukan.");

  const b = UpdateBody.parse(await req.json());
  await db.update(goals).set({
    name: b.name,
    targetAmount: typeof b.targetAmount === "number" ? String(b.targetAmount) : undefined,
    targetDate: b.targetDate === undefined ? undefined : (b.targetDate ?? null),
    startAmount: typeof b.startAmount === "number" ? String(b.startAmount) : undefined,
    linkedAccountId: b.linkedAccountId === undefined ? undefined : (b.linkedAccountId ?? null),
    archived: b.archived,
    note: typeof b.note === "undefined" ? undefined : (b.note ?? null),
    color: b.color,
  }).where(eq(goals.id, id));

  return { ok: true };
});

export const DELETE = handleApi(async (req: Request) => {
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

  const id = req.url.split('/').pop()!;

  const own = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, userId)),
    columns: { id: true }
  });
  if (!own) throw new NotFoundError("Goal tidak ditemukan.");

  await db.transaction(async (tx) => {
    await tx.delete(goalContributions).where(eq(goalContributions.goalId, id));
    await tx.delete(goals).where(eq(goals.id, id));
  });

  return { ok: true };
});
