export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  name: z.string().min(1).max(60).optional(),
  kind: z.enum(["income","expense"]).optional(),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(40).optional(),
});

export const PATCH = handleApi(async (req: Request) => {
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
  
  const id = req.url.split('/').pop()!;

  const own = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, userId)),
    columns: { id: true }
  });
  if (!own) throw new NotFoundError("Kategori tidak ditemukan.");

  const body = UpdateBody.parse(await req.json());
  const hex = body.color ? (body.color.startsWith("#") ? body.color : `#${body.color}`) : undefined;

  await db.update(categories).set({
    name: body.name,
    kind: body.kind,
    color: hex,
    icon: body.icon,
  }).where(eq(categories.id, id));

  return { ok: true };
});

export const DELETE = handleApi(async (_req: Request) => {
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

  const id = _req.url.split('/').pop()!;

  const own = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, userId)),
    columns: { id: true }
  });
  if (!own) throw new NotFoundError("Kategori tidak ditemukan.");

  // cegah hapus jika dipakai transaksi
  const used = await db.query.transactions.findFirst({
    where: eq(transactions.categoryId, id),
    columns: { id: true }
  });
  if (used) throw new BadRequestError("Kategori sedang dipakai transaksi. Pindahkan/hapus transaksi terlebih dahulu.");

  await db.delete(categories).where(eq(categories.id, id));
  return { ok: true };
});