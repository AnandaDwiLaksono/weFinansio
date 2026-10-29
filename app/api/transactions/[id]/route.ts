export const runtime = "nodejs";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  accounts,
  goalContributions,
  transactions,
  users,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/errors";
import { handleApi } from "@/lib/http";

const UpdateBody = z.object({
  occurredAt: z.string(),
  amount: z.number().positive(),
  note: z.string().max(200).nullable().optional(),
});

async function resolveUserId() {
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
  return userId;
}

export const PATCH = handleApi(async (req: Request) => {
  const userId = await resolveUserId();
  const id = req.url.split("/").pop()!;
  const body = UpdateBody.parse(await req.json());
  const occurredAt = new Date(body.occurredAt);
  if (Number.isNaN(occurredAt.getTime()))
    throw new BadRequestError("Tanggal transaksi tidak valid.");
  const occurredAtDate = occurredAt.toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    const trx = await tx.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
      columns: {
        id: true,
        amount: true,
        accountId: true,
        type: true,
        transferToAccountId: true,
        transferGroupId: true,
      },
    });
    if (!trx) throw new NotFoundError("Transaksi tidak ditemukan.");

    const groupRows = trx.transferGroupId
      ? await tx.query.transactions.findMany({
          where: and(
            eq(transactions.userId, userId),
            eq(transactions.transferGroupId, trx.transferGroupId),
          ),
          columns: { id: true },
        })
      : [trx];
    if (groupRows.length === 0)
      throw new NotFoundError("Transaksi tidak ditemukan.");

    const transactionWhere = trx.transferGroupId
      ? and(
          eq(transactions.userId, userId),
          eq(transactions.transferGroupId, trx.transferGroupId),
        )
      : and(eq(transactions.id, id), eq(transactions.userId, userId));

    await tx
      .update(transactions)
      .set({
        occurredAt: occurredAtDate,
        amount: String(body.amount),
        note: body.note ?? null,
      })
      .where(transactionWhere);

    if (Number(trx.amount) === body.amount) return;

    const difference = body.amount - Number(trx.amount);
    const updateAccount = async (
      accountId: string,
      expression: ReturnType<typeof sql>,
    ) => {
      const [updated] = await tx
        .update(accounts)
        .set({ balance: expression })
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .returning({ id: accounts.id });
      if (!updated)
        throw new BadRequestError(
          "Akun tidak ditemukan saat memperbarui saldo.",
        );
    };

    if (trx.type === "income") {
      await updateAccount(
        trx.accountId,
        sql`${accounts.balance} + ${difference}`,
      );
    } else if (trx.type === "expense") {
      await updateAccount(
        trx.accountId,
        sql`${accounts.balance} - ${difference}`,
      );
    } else if (trx.type === "transfer" && trx.transferToAccountId) {
      // Pasangan lama dari endpoint transfer khusus dibuat tanpa mutasi saldo.
      // Jangan menerapkan delta hanya karena metadata pasangan diedit.
      if (groupRows.length === 1) {
        await updateAccount(
          trx.accountId,
          sql`${accounts.balance} - ${difference}`,
        );
        await updateAccount(
          trx.transferToAccountId,
          sql`${accounts.balance} + ${difference}`,
        );
      }
    }
  });

  return { ok: true };
});

export const DELETE = handleApi(async (req: Request) => {
  const userId = await resolveUserId();
  const id = req.url.split("/").pop()!;

  await db.transaction(async (tx) => {
    const trx = await tx.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.userId, userId)),
      columns: {
        id: true,
        amount: true,
        accountId: true,
        type: true,
        transferToAccountId: true,
        transferGroupId: true,
      },
    });
    if (!trx) throw new NotFoundError("Transaksi tidak ditemukan.");

    const groupRows = trx.transferGroupId
      ? await tx.query.transactions.findMany({
          where: and(
            eq(transactions.userId, userId),
            eq(transactions.transferGroupId, trx.transferGroupId),
          ),
          columns: { id: true },
        })
      : [trx];
    if (groupRows.length === 0)
      throw new NotFoundError("Transaksi tidak ditemukan.");

    const transactionIds = groupRows.map((row) => row.id);
    await tx
      .delete(goalContributions)
      .where(
        and(
          eq(goalContributions.userId, userId),
          inArray(goalContributions.transactionId, transactionIds),
        ),
      );

    if (trx.transferGroupId) {
      await tx
        .delete(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.transferGroupId, trx.transferGroupId),
          ),
        );
    } else {
      await tx
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    }

    const updateAccount = async (
      accountId: string,
      expression: ReturnType<typeof sql>,
    ) => {
      const [updated] = await tx
        .update(accounts)
        .set({ balance: expression })
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .returning({ id: accounts.id });
      if (!updated)
        throw new BadRequestError(
          "Akun tidak ditemukan saat memperbarui saldo.",
        );
    };

    if (trx.type === "income") {
      await updateAccount(
        trx.accountId,
        sql`${accounts.balance} - ${trx.amount}`,
      );
    } else if (trx.type === "expense") {
      await updateAccount(
        trx.accountId,
        sql`${accounts.balance} + ${trx.amount}`,
      );
    } else if (
      trx.type === "transfer" &&
      trx.transferToAccountId &&
      groupRows.length === 1
    ) {
      await updateAccount(
        trx.accountId,
        sql`${accounts.balance} + ${trx.amount}`,
      );
      await updateAccount(
        trx.transferToAccountId,
        sql`${accounts.balance} - ${trx.amount}`,
      );
    }
    // Pasangan lama berisi dua baris tetapi tidak pernah mengubah saldo saat dibuat.
    // Hapus keduanya bersama-sama tanpa menambahkan mutasi saldo yang tidak pernah ada.
  });

  return { ok: true };
});
