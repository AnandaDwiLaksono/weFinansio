export const runtime = "nodejs";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const Body = z.object({ ids: z.array(z.string().uuid()).min(1) });

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

  const { ids } = Body.parse(await req.json());
  await db.delete(transactions).where(and(eq(transactions.userId, userId), inArray(transactions.id, ids)));
  return { ok: true, deleted: ids.length };
});
