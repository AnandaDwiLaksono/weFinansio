export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { goals, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

export const GET = handleApi(async (req: Request) => {
  // Authenticate user & get userId
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

  const accountId = req.url.split('/').slice(-2)[0];

  const linkedGoals = await db.query.goals.findMany({
    where: and(
      eq(goals.userId, userId),
      eq(goals.linkedAccountId, accountId),
      eq(goals.archived, false)
    ),
    columns: {
      id: true,
      name: true,
      color: true,
    }
  });

  return { items: linkedGoals };
});
