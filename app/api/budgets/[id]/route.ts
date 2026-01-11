export const runtime = "nodejs";

import { and, between, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgets, transactions, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import { periodRange } from "@/lib/utils";

const ListQuery = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/).nonempty(),
});
const UpdateBody = z.object({
  limitAmount: z.number().nonnegative().optional(),
  carryover: z.boolean().optional(),
  accumulatedCarryover: z.number().optional(),
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

  const id = req.url.split('/').pop()!.split('?')[0];

  const url = new URL(req.url);
  const p = ListQuery.parse(Object.fromEntries(url.searchParams));
  
  let accumulatedCarryover: number = 0;

  // Get start date of the period
  const startDate = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { startDatePeriod: true }
  });

  const startDatePeriod = Number(startDate?.startDatePeriod) || 1;
  const prev = prevPeriod(p.periodMonth);
  const { start: prevStart, end: prevEnd } = periodRange(prev, startDatePeriod);
  
  // Get previous budget
  const prevBudget = await db.query.budgets.findFirst({
    where: and(
      eq(budgets.userId, userId),
      eq(budgets.categoryId, id),
      eq(budgets.periodMonth, prev)
    ),
    columns: { amount: true, accumulatedCarryover: true }
  });
  
  if (prevBudget) {
    // Calculate previous month spent
    const prevSpentResult = await db.select({
      spent: sql<string>`SUM(${transactions.amount})::text`
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.categoryId, id),
      eq(transactions.type, "expense"),
      between(transactions.occurredAt, prevStart, prevEnd)
    ));
    
    const prevSpent = Number(prevSpentResult[0]?.spent || 0);
    const prevLimit = Number(prevBudget.amount || 0);
    const prevAccumulated = Number(prevBudget.accumulatedCarryover || 0);
    
    // Total effective limit previous month
    const prevEffectiveLimit = prevLimit + prevAccumulated;
    
    // Remaining from previous month becomes new accumulated carryover
    accumulatedCarryover = prevEffectiveLimit - prevSpent;
  }

  return { accumulatedCarryover };
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

function prevPeriod(p: string) {
  const [y, m] = p.split("-").map(Number);
  const d = new Date(y, m - 2, 1);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
