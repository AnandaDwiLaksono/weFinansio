export const runtime = "nodejs";

import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { assetsMaster, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

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

  const rows = await db.select({
    symbol: assetsMaster.symbol,
    name: assetsMaster.name,
  }).from(assetsMaster)
    .where(eq(assetsMaster.userId, userId))
    .orderBy(asc(assetsMaster.symbol));

  return { items: rows };
});
