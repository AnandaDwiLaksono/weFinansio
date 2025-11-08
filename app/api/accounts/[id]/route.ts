export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts, transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  name: z.string().min(1).max(80).optional(),
  type: z.enum(["cash","bank","ewallet","investment"]).optional(),
  currency: z.string().length(3).optional(),
  balance: z.number().nonnegative().optional(),
  note: z.string().max(200).nullable().optional(),
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

  const own = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, id), eq(accounts.userId, userId)),
    columns: { id: true }
  });
  if (!own) throw new NotFoundError("Akun tidak ditemukan.");

  const body = UpdateBody.parse(await req.json());
  await db.update(accounts).set({
    name: body.name,
    type: body.type,
    currencyCode: body.currency,
    // balance: typeof body.balance === "number" ? String(body.balance) : undefined,
    // note: typeof body.note === "undefined" ? undefined : (body.note ?? null),
  }).where(eq(accounts.id, id));

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

  const own = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, id), eq(accounts.userId, userId)),
    columns: { id: true }
  });
  if (!own) throw new NotFoundError("Akun tidak ditemukan.");

  // opsional: cegah hapus jika ada transaksi
  const trx = await db.query.transactions.findFirst({
    where: eq(transactions.accountId, id),
    columns: { id: true }
  });
  if (trx) throw new BadRequestError("Akun memiliki transaksi. Pindahkan/hapus transaksi terlebih dahulu.");

  await db.delete(accounts).where(eq(accounts.id, id));
  return { ok: true };
});
