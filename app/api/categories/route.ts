export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import { parseJson } from "@/lib/validate";

const Create = z.object({
  name: z.string().min(2).max(60),
  kind: z.enum(["expense","income"]),
  color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).optional(),
  icon: z.string().max(40).optional(), // simpan nama ikon (mis. "Wallet")
});

export const GET = handleApi(async () => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new UnauthorizedError();

  const rows = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
    orderBy: categories.createdAt,
    columns: { id:true, name:true, kind:true, color:true, icon:true }
  });
  return { items: rows };
});

export const POST = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new UnauthorizedError();

  const data = await parseJson(req, Create);

  const exists = await db.query.categories.findFirst({
    where: and(eq(categories.userId, userId), eq(categories.name, data.name), eq(categories.kind, data.kind)),
    columns: { id: true },
  });
  if (exists) throw new ConflictError("Nama kategori sudah ada pada jenis yang sama.");

  const [row] = await db.insert(categories).values({
    userId, name: data.name, kind: data.kind, color: data.color ?? null, icon: data.icon ?? null
  }).returning({ id: categories.id });

  return { id: row?.id };
});
