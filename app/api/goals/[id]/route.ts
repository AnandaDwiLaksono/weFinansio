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
  
  // Handle string "null" being sent as linkedAccountId
  const linkedAccountId = b.linkedAccountId === "null" || !b.linkedAccountId ? null : b.linkedAccountId;
  // Handle empty note being sent as empty string
  const note = b.note === "" || !b.note ? null : b.note;
  
  await db.update(goals).set({
    name: b.name,
    targetAmount: String(b.targetAmount),
    targetDate: b.targetDate ?? null,
    startAmount: String(b.startAmount),
    linkedAccountId: linkedAccountId,
    archived: b.archived,
    note: note,
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
