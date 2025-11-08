export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { transactions, accounts, categories, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

const UpdateBody = z.object({
  occurredAt: z.string().optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["income","expense"]).optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
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

  const trx = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
    columns: { id: true }
  });
  if (!trx) throw new NotFoundError("Transaksi tidak ditemukan.");

  const body = UpdateBody.parse(await req.json());

  if (body.accountId) {
    const own = await db.query.accounts.findFirst({
      where: and(eq(accounts.id, body.accountId), eq(accounts.userId, userId)),
      columns: { id: true }
    });
    if (!own) throw new BadRequestError("Akun tidak valid.");
  }
  if (typeof body.categoryId !== "undefined" && body.categoryId !== null) {
    const own = await db.query.categories.findFirst({
      where: and(eq(categories.id, body.categoryId), eq(categories.userId, userId)),
      columns: { id: true }
    });
    if (!own) throw new BadRequestError("Kategori tidak valid.");
  }

  await db.update(transactions).set({
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    amount: body.amount ? String(body.amount) : undefined,
    type: body.type,
    accountId: body.accountId,
  }).where(eq(transactions.id, id));

  return { ok: true };
});

export const DELETE = handleApi(async (req: Request) => {
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

  const trx = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
    columns: { id: true }
  });
  if (!trx) throw new NotFoundError("Transaksi tidak ditemukan.");

  await db.delete(transactions).where(eq(transactions.id, id));
  return { ok: true };
});
