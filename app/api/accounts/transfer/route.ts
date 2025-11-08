export const runtime = "nodejs";

import { z } from "zod";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";

const Body = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  occurredAt: z.string(), // ISO
  note: z.string().max(200).optional(),
});

export const POST = handleApi(async (req: Request) => {
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

  const p = Body.parse(await req.json());
  if (p.fromAccountId === p.toAccountId) {
    throw new BadRequestError("Akun sumber & tujuan tidak boleh sama.");
  }

  // validasi kepemilikan akun
  const [fromAcc, toAcc] = await Promise.all([
    db.query.accounts.findFirst({ where: and(eq(accounts.id, p.fromAccountId), eq(accounts.userId, userId)) }),
    db.query.accounts.findFirst({ where: and(eq(accounts.id, p.toAccountId), eq(accounts.userId, userId)) }),
  ]);
  if (!fromAcc || !toAcc) throw new BadRequestError("Akun tidak valid.");

  const gid = randomUUID(); // transfer_group
  const at = new Date(p.occurredAt);
  const amountStr = String(p.amount);

  // dua baris transaksi (atomic)
  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      userId,
      occurredAt: at,
      amount: amountStr,
      type: "expense",
      accountId: p.fromAccountId,
      categoryId: null,
      note: p.note ?? `Transfer ke ${toAcc.name}`,
      transferGroupId: gid,
    });
    await tx.insert(transactions).values({
      userId,
      occurredAt: at,
      amount: amountStr,
      type: "income",
      accountId: p.toAccountId,
      categoryId: null,
      note: p.note ?? `Transfer dari ${fromAcc.name}`,
      transferGroupId: gid,
    });
  });

  return { ok: true, transferGroupId: gid };
});
