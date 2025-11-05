export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, transactions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import { parseJson } from "@/lib/validate";

const Update = z.object({
  name: z.string().min(2).max(60).optional(),
  kind: z.enum(["expense","income"]).optional(),
  color: z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
});

const DeleteBody = z.object({
  mergeTo: z.string().uuid().optional(), // jika ingin relokasi transaksi ke kategori lain
});

export const PATCH = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new UnauthorizedError();

  const id = req.url.split('/').pop()!;
  const data = await parseJson(req, Update);
  const cat = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, userId)),
    columns: { id:true }
  });
  if (!cat) throw new NotFoundError("Kategori tidak ditemukan.");

  await db.update(categories).set({ ...data }).where(eq(categories.id, id));
  return { ok: true };
});
export const DELETE = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new UnauthorizedError();

  const id = req.url.split('/').pop()!;
  const cat = await db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, userId)),
    columns: { id:true, kind:true }
  });
  if (!cat) throw new NotFoundError("Kategori tidak ditemukan.");

  const { mergeTo } = await parseJson(req, DeleteBody).catch(()=>({ mergeTo: undefined }));

  if (mergeTo) {
    // pindahkan transaksi ke kategori lain (pastikan milik user & kind sama)
    const target = await db.query.categories.findFirst({
      where: and(eq(categories.id, mergeTo), eq(categories.userId, userId)),
      columns: { id:true, kind:true }
    });
    if (!target || target.kind !== cat.kind) throw new ForbiddenError("Kategori tujuan tidak valid.");
    await db.update(transactions).set({ categoryId: target.id }).where(eq(transactions.categoryId, id));
  } else {
    // jika tidak merge, hapus transaksi yang memakai kategori ini? (umumnya dilarang)
    const used = await db.query.transactions.findFirst({
      where: eq(transactions.categoryId, id),
      columns: { id:true }
    });
    if (used) throw new ForbiddenError("Kategori masih dipakai transaksi. Gunakan mergeTo untuk memindahkan.");
  }

  await db.delete(categories).where(eq(categories.id, id));
  return { ok: true };
});
