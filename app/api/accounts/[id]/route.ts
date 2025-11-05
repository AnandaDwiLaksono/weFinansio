export const runtime = "nodejs";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

const Update = z.object({
  name: z.string().min(2).max(80).optional(),
  type: z.enum(["cash","bank","ewallet","investment"]).optional(),
  currencyCode: z.string().length(3).optional(),
});

export const PATCH = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new UnauthorizedError();

  const data = await req.json().then((b)=>Update.parse(b));
  const acc = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, req.url.split('/').pop()!), eq(accounts.userId, userId)),
    columns: { id:true }
  });
  if (!acc) throw new NotFoundError("Akun tidak ditemukan.");

  await db.update(accounts).set({ ...data }).where(eq(accounts.id, req.url.split('/').pop()!));
  return { ok: true };
});

export const DELETE = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new UnauthorizedError();

  const id = req.url.split('/').pop()!;

  // Cek kepemilikan
  const acc = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, id), eq(accounts.userId, userId)),
    columns: { id:true }
  });
  if (!acc) throw new NotFoundError("Akun tidak ditemukan.");

  // Cek transaksi yang terhubung (opsional: larang hapus)
  const [{ cnt }] = await db.select({ cnt: sql<number>`COUNT(*)::int` })
    .from(transactions).where(eq(transactions.accountId, id));

  if (cnt > 0) throw new ForbiddenError("Akun memiliki transaksi. Hapus/relokasi transaksi terlebih dahulu.");

  await db.delete(accounts).where(eq(accounts.id, id));
  return { ok: true };
});
