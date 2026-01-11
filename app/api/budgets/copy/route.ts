export const runtime = "nodejs";

import { and, eq, sql, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { budgets, transactions, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";
import { periodRange, prevPeriod } from "@/lib/utils";

const Q = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).nonempty(),
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
  
  const url = new URL(req.url);
  const { period } = Q.parse(Object.fromEntries(url.searchParams));
  
  // Get start date of the period
  const startDate = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { startDatePeriod: true }
  });

  const startDatePeriod = Number(startDate?.startDatePeriod) || 1;
  const prev = prevPeriod(period);
  const { start: prevStart, end: prevEnd } = periodRange(prev, startDatePeriod);

  const src = await db.query.budgets.findMany({
    where: and(eq(budgets.userId, userId), eq(budgets.periodMonth, prev)),
    columns: { categoryId: true, amount: true, carryover: true, accumulatedCarryover: true }
  });
  if (src.length === 0) return { ok: true, copied: 0 };

  const dstExist = await db.query.budgets.findMany({
    where: and(eq(budgets.userId, userId), eq(budgets.periodMonth, period)),
    columns: { categoryId:true, id:true }
  });
  const existMap = new Map(dstExist.map(d => [d.categoryId, d.id]));

  let copied = 0;
  await db.transaction(async (tx) => {
    for (const s of src) {
      const existsId = existMap.get(s.categoryId);
      if (existsId) {
        if (s.carryover) {
          // Calculate previous month spent
          const prevSpentResult = await tx
            .select({
              spent: sql<string>`SUM(${transactions.amount})::text`
            })
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.categoryId, s.categoryId),
              gte(transactions.occurredAt, prevStart),
              lte(transactions.occurredAt, prevEnd)
            ));

          const prevSpent = Number(prevSpentResult[0].spent ?? "0");
          const prevAmount = Number(s.amount ?? 0);
          const prevAccumulated = Number(s.accumulatedCarryover ?? 0);
          const prevLimit = prevAmount + prevAccumulated;
          const newAccumulatedCarryover = prevLimit - prevSpent;

          // Update existing with carryover
          await tx.update(budgets).set({
            amount: s.amount,
            carryover: s.carryover,
            accumulatedCarryover: newAccumulatedCarryover.toString(),
          }).where(eq(budgets.id, existsId));
        } else {
          // Update existing without carryover
          await tx.update(budgets).set({
            amount: s.amount,
            carryover: s.carryover,
            accumulatedCarryover: "0",
          }).where(eq(budgets.id, existsId));
        }

        copied++;
      } else {
        if (s.carryover) {
          // Calculate previous month spent
          const prevSpentResult = await tx
            .select({
              spent: sql<string>`SUM(${transactions.amount})::text`
            })
            .from(transactions)
            .where(and(
              eq(transactions.userId, userId),
              eq(transactions.categoryId, s.categoryId),
              gte(transactions.occurredAt, prevStart),
              lte(transactions.occurredAt, prevEnd)
            ));

          const prevSpent = Number(prevSpentResult[0].spent ?? "0");
          const prevAmount = Number(s.amount ?? 0);
          const prevAccumulated = Number(s.accumulatedCarryover ?? 0);
          const prevLimit = prevAmount + prevAccumulated;
          const newAccumulatedCarryover = prevLimit - prevSpent;

          // Insert new with carryover
          await tx.insert(budgets).values({
            userId,
            categoryId: s.categoryId,
            periodMonth: period,
            amount: s.amount,
            carryover: s.carryover,
            accumulatedCarryover: newAccumulatedCarryover.toString(),
          });
        } else {
          // Insert new without carryover
          await tx.insert(budgets).values({
            userId,
            categoryId: s.categoryId,
            periodMonth: period,
            amount: s.amount,
            carryover: s.carryover,
            accumulatedCarryover: "0",
          });
        }

        copied++;
      }
    }
  });

  return { ok: true, copied };
});
