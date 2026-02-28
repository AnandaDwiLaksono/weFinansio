export const runtime = "nodejs";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { goals, goalContributions, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import { periodRange, currentPeriod } from "@/lib/utils";

export const GET = handleApi(async () => {
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
      
  // Get start date of the period
  const startDate = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { startDatePeriod: true }
  });
  
  const startDatePeriod = Number(startDate?.startDatePeriod) || 1;
  const currPeriod = currentPeriod(startDatePeriod);
  const { start, end } = periodRange(currPeriod, startDatePeriod);

  // sum kontribusi per goal
  const sums = await db
    .select({
      goalId: goalContributions.goalId,
      saved: sql<string>`COALESCE(SUM(${goalContributions.amount}), 0)::text`,
      savedThisMonth: sql<string>`COALESCE(SUM(CASE WHEN ${goalContributions.occurredAt} >= ${start} AND ${goalContributions.occurredAt} < ${end} THEN ${goalContributions.amount} END), 0)::text`,
    })
    .from(goalContributions)
    .where(eq(goalContributions.userId, userId))
    .groupBy(goalContributions.goalId);

  const map = new Map<string, { saved: number; savedThisMonth: number }>();
  sums.forEach(x => map.set(String(x.goalId), { saved: Number(x.saved), savedThisMonth: Number(x.savedThisMonth) }));

  const rows = await db
    .select({
      id: goals.id,
      name: goals.name,
      target: sql<string>`${goals.targetAmount}::text`,
      dueDate: goals.targetDate,
      saved: sql<string>`COALESCE(${goals.startAmount}, 0)::text`, // string
      color: goals.color,
    })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.archived, false)));

  return rows.map(g => {
    const agg = map.get(String(g.id)) ?? { saved: 0, savedThisMonth: 0 };
    const target = Number(g.target ?? 0);
    const startAmount = Number(g.saved ?? 0);
    const totalSaved = agg.saved + startAmount;
    const pct = target > 0 ? Math.min(totalSaved / target, 1) : 0;

    return {
      id: g.id,
      name: g.name,
      target,
      saved: totalSaved,
      savedThisMonth: agg.savedThisMonth,
      pct,
      dueDate: g.dueDate,
      color: g.color,
    };
  });
});
