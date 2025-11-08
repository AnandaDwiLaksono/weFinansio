export const runtime = "nodejs";

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const Body = z.object({
  ids: z.array(z.string().uuid()).min(1),
  cleared: z.boolean().optional(),
  reconciled: z.boolean().optional(),
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

  const p = Body.parse(await req.json());
  await db.update(transactions).set({
    cleared: typeof p.cleared === "boolean" ? p.cleared : undefined,
    reconciled: typeof p.reconciled === "boolean" ? p.reconciled : undefined,
  }).where(and(eq(transactions.userId, userId), inArray(transactions.id, p.ids)));

  return { ok: true };
});
