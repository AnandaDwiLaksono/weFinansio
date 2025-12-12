export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { users, userSettings } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  baseCurrency: z.string().length(3).optional(),
  startDatePeriod: z.string().refine((val) => {
    const num = Number(val);
    return Number.isInteger(num) && num >= 1 && num <= 28;
  }).optional(),
  themeMode: z.enum(["light", "dark"]).optional(),
  offlineMode: z.enum(["minimal","full"]).optional(),
});

export const GET = handleApi(async (_req: Request) => {
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

  if (!userId) throw new UnauthorizedError("No user id in session.");

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      // image: users.image,
    })
    .from(users)
    .where(eq(users.id, userId));

  let settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  if (!settings) {
    const [created] = await db.insert(userSettings).values({ userId }).returning();
    settings = created;
  }

  return {
    user,
    settings: {
      baseCurrency: settings.baseCurrency,
      startDatePeriod: settings.startDatePeriod,
      themeMode: settings.themeMode,
      offlineMode: settings.offlineMode,
    },
  };
});

export const PUT = handleApi(async (req: Request) => {
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

  if (!userId) throw new UnauthorizedError("No user id in session.");

  const body = UpdateBody.parse(await req.json());

  await db
    .insert(userSettings)
    .values({ userId, ...body })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        ...body,
        updatedAt: new Date(),
      },
    });

  return { ok: true };
});
