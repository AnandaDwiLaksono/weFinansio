export const runtime = "nodejs";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { goals, goalContributions, users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

function periodRange(period: string, startDate: number = 1) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(y, m - 1, startDate + 1).toISOString().split('T')[0];
  const end = new Date(y, m, startDate).toISOString().split('T')[0];

  return { start, end };
}

function currentPeriod(startDate: number = 1) {
  const [y, m, d] = new Date().toISOString().split("T")[0].split("-").map(Number);
  if (d < startDate) {
    const prevMonth = m - 1 === 0 ? 12 : m - 1;
    const prevYear = prevMonth === 12 ? y - 1 : y;

    return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  } else {
    return `${y}-${String(m).padStart(2, "0")}`;
  }
}

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
    })
    .from(goals)
    .where(eq(goals.userId, userId));

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
    };
  });
});
