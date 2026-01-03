export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { goalContributions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  occurredAt: z.string(),
  amount: z.number(),
  notes: z.string().max(200).nullable().optional(),
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

  const id = req.url.split('/').slice(-2)[0];

  const result = await db.query.goalContributions.findFirst({
    where: and(eq(goalContributions.userId, userId), eq(goalContributions.transactionId, id)),
    columns: {
      id: true,
      goalId: true,
      transactionId: true,
      amount: true,
    }
  });

  // Return as array for consistency with frontend expectation
  return { items: result ? [result] : [] };
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

  const id = req.url.split('/').slice(-2)[0];

  const body = UpdateBody.parse(await req.json());

  await db.update(goalContributions).set({
    occurredAt: body.occurredAt,
    amount: String(body.amount),
    note: body.notes,
  }).where(eq(goalContributions.transactionId, id));

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

  const id = req.url.split('/').slice(-2)[0];

  await db.delete(goalContributions).where(eq(goalContributions.transactionId, id));

  return { ok: true };
});
