export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

export const GET = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();

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
      icon: true,
    }
  });

  return { items: linkedGoals };
});
