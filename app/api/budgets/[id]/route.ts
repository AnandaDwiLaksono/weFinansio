export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgets, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  limitAmount: z.number().nonnegative().optional(),
  carryover: z.boolean().optional(),
  accumulatedCarryover: z.number().nonnegative().optional(),
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

  const own = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, id), eq(budgets.userId, userId)),
    columns: { id: true }
  });
  if (!own) throw new NotFoundError("Budget tidak ditemukan.");

  const body = UpdateBody.parse(await req.json());
  await db.update(budgets).set({
    amount: typeof body.limitAmount === "number" ? String(body.limitAmount) : undefined,
    carryover: typeof body.carryover === "boolean" ? body.carryover : undefined,
    accumulatedCarryover: typeof body.accumulatedCarryover === "number" ? String(body.accumulatedCarryover) : undefined,
  }).where(eq(budgets.id, id));

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

  const own = await db.query.budgets.findFirst({
    where: and(eq(budgets.id, id), eq(budgets.userId, userId)),
    columns: { id: true }
  });
  if (!own) throw new NotFoundError("Budget tidak ditemukan.");

  await db.delete(budgets).where(eq(budgets.id, id));
  return { ok: true };
});