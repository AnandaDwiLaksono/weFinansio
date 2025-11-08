export const runtime = "nodejs";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { goals, goalContributions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

function monthRange(d = new Date()) {
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  const e = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { s, e };
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

  const { s, e } = monthRange();

  // sum kontribusi per goal
  const sums = await db
    .select({
      goalId: goalContributions.goalId,
      saved: sql<string>`COALESCE(SUM(${goalContributions.amount}), 0)::text`,
      savedThisMonth: sql<string>`COALESCE(SUM(CASE WHEN ${goalContributions.occurredAt} >= ${s} AND ${goalContributions.occurredAt} < ${e} THEN ${goalContributions.amount} END), 0)::text`,
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
    })
    .from(goals)
    .where(eq(goals.userId, userId));

  return rows.map(g => {
    const agg = map.get(String(g.id)) ?? { saved: 0, savedThisMonth: 0 };
    const target = Number(g.target ?? 0);
    const pct = target > 0 ? Math.min(agg.saved / target, 1) : 0;
    return {
      id: g.id,
      name: g.name,
      target,
      saved: agg.saved,
      savedThisMonth: agg.savedThisMonth,
      pct,
      dueDate: g.dueDate,
    };
  });
});
