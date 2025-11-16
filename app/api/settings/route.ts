export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, userSettings, categories } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  baseCurrency: z.string().length(3).optional(),
  defaultIncomeCategoryId: z.string().uuid().nullable().optional(),
  defaultExpenseCategoryId: z.string().uuid().nullable().optional(),
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

  // ambil nama kategori default
  const catIds = [settings.defaultIncomeCategoryId, settings.defaultExpenseCategoryId].filter(Boolean) as string[];
  let catMap = new Map<string,string>();
  if (catIds.length) {
    const cats = await db.query.categories.findMany({
      where: (c, { inArray }) => inArray(c.id, catIds),
      columns: { id:true, name:true },
    });
    catMap = new Map(cats.map(c => [c.id, c.name]));
  }

  return {
    user,
    settings: {
      baseCurrency: settings.baseCurrency,
      defaultIncomeCategoryId: settings.defaultIncomeCategoryId,
      defaultIncomeCategoryName: settings.defaultIncomeCategoryId ? catMap.get(settings.defaultIncomeCategoryId) ?? null : null,
      defaultExpenseCategoryId: settings.defaultExpenseCategoryId,
      defaultExpenseCategoryName: settings.defaultExpenseCategoryId ? catMap.get(settings.defaultExpenseCategoryId) ?? null : null,
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
