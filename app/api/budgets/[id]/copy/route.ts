export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { budgets, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const ListQuery = z.object({
  lastPeriodMonth: z.string().regex(/^\d{4}-\d{2}-01$/).default(currentPeriod()),
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

  const url = new URL(req.url);
  const p = ListQuery.parse(Object.fromEntries(url.searchParams));

  const budget = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.id, id),
      eq(budgets.userId, userId),
      eq(budgets.periodMonth, p.lastPeriodMonth)
    ),
    columns: { amount: true }
  });
  if (!budget) throw new NotFoundError("Budget not found.");

  return { budget };
});

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
