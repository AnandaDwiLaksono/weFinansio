export const runtime = "nodejs";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { accounts, transactions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";

const UpdateBody = z.object({
  occurredAt: z.string(),
  amount: z.number().positive(),
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

  // check transaksi exists
  const trx = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
    columns: { id: true, amount: true, accountId: true, type: true, transferToAccountId: true }
  });
  if (!trx) throw new NotFoundError("Transaksi tidak ditemukan.");

  const body = UpdateBody.parse(await req.json());

  // update transaksi
  await db.update(transactions).set({
    occurredAt: body.occurredAt,
    amount: String(body.amount),
    note: body.note,
  }).where(eq(transactions.id, id));

  // update account balances if needed
  if (trx.amount !== String(body.amount)) {
    if (trx.type === "income") {
      // adjust account balance
      const diff = Number(body.amount) - Number(trx.amount);
      await db.update(accounts).set({
        balance: sql`${accounts.balance} + ${diff}`,
      }).where(eq(accounts.id, trx.accountId));
    } else if (trx.type === "expense") {
      // adjust account balance
      const diff = Number(trx.amount) - Number(body.amount);
      await db.update(accounts).set({
        balance: sql`${accounts.balance} + ${diff}`,
      }).where(eq(accounts.id, trx.accountId));
    } else if (trx.type === "transfer" && trx.transferToAccountId) {
      // adjust both accounts
      const diff = Number(body.amount) - Number(trx.amount);
      await db.update(accounts).set({
        balance: sql`${accounts.balance} + ${diff}`,
      }).where(eq(accounts.id, trx.accountId));
      await db.update(accounts).set({
        balance: sql`${accounts.balance} - ${diff}`,
      }).where(eq(accounts.id, trx.transferToAccountId));
    }
  }

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

  // check transaksi exists
  const trx = await db.query.transactions.findFirst({
    where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
    columns: { id: true, amount: true, accountId: true, type: true, transferToAccountId: true }
  });
  if (!trx) throw new NotFoundError("Transaksi tidak ditemukan.");

  // delete transaksi
  await db.delete(transactions).where(eq(transactions.id, id));

  // update account balances
  if (trx.type === "income") {
    // reduce account balance
    await db.update(accounts).set({
      balance: sql`${accounts.balance} - ${trx.amount}`,
    }).where(eq(accounts.id, trx.accountId));
  } else if (trx.type === "expense") {
    // increase account balance
    await db.update(accounts).set({
      balance: sql`${accounts.balance} + ${trx.amount}`,
    }).where(eq(accounts.id, trx.accountId));
  } else if (trx.type === "transfer" && trx.transferToAccountId) {
    // adjust both accounts
    await db.update(accounts).set({
      balance: sql`${accounts.balance} - ${trx.amount}`,
    }).where(eq(accounts.id, trx.accountId));
    
    await db.update(accounts).set({
      balance: sql`${accounts.balance} + ${trx.amount}`,
    }).where(eq(accounts.id, trx.transferToAccountId));
  }

  return { ok: true };
});
