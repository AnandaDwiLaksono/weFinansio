export const runtime = "nodejs";

import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { goals, goalContributions, users, accounts, transactions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const CreateBody = z.object({
  type: z.enum(["deposit", "withdraw"]).default("deposit"),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO
  amount: z.number().positive(), // always positive, type determines direction
  note: z.string().max(200).optional(),
  accountId: z.uuid(), // account untuk transfer (source atau destination tergantung type)
  targetAccountId: z.uuid(), // optional override untuk target account
  transactionId: z.uuid().optional(), // if provided, link to existing transaction
});

export const GET = handleApi(async (req: Request) => {
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

  const id = req.url.split('/').slice(-2)[0];

  const own = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, userId)),
    columns: { id:true }
  });
  if (!own) throw new NotFoundError("Goal tidak ditemukan.");

  const items = await db
    .select({
      id: goalContributions.id,
      occurredAt: goalContributions.occurredAt,
      amount: sql<string>`${goalContributions.amount}::text`,
      note: goalContributions.note,
    })
    .from(goalContributions)
    .where(and(eq(goalContributions.userId, userId), eq(goalContributions.goalId, id)))
    .orderBy(desc(goalContributions.occurredAt));

  return { items };
});

export const POST = handleApi(async (req: Request) => {
  // Authenticate user & get userId
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

  // Get goal ID from URL
  const id = req.url.split('/').slice(-2)[0];

  // Verify goal ownership
  const own = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, userId)),
    columns: { id: true, name: true, linkedAccountId: true }
  });
  if (!own) throw new NotFoundError("Goal tidak ditemukan.");

  // Parse and validate request body
  const b = CreateBody.parse(await req.json());
  const occurredAt = b.occurredAt || new Date().toISOString().split('T')[0];

  // Jika tidak ada transactionId, lanjut dengan flow normal (buat transaction baru)
  const userAcc = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, b.accountId), eq(accounts.userId, userId)),
    columns: { id: true }
  });
  if (!userAcc) throw new BadRequestError("Rekening tidak valid.");

  // Validasi target account jika di-override
  if (b.targetAccountId) {
    const targetAcc = await db.query.accounts.findFirst({
      where: and(eq(accounts.id, b.targetAccountId), eq(accounts.userId, userId)),
      columns: { id: true }
    });
    if (!targetAcc) throw new BadRequestError("Rekening tujuan tidak valid.");
  }

  // Tentukan goal's linked account atau pakai override
  const goalAccountId = b.targetAccountId || own.linkedAccountId;
  if (!goalAccountId) {
    throw new BadRequestError("Goal tidak memiliki rekening tujuan. Harap pilih rekening tujuan.");
  }

  const noteBase = b.note || "";
  const txNote = [noteBase, `Goal: ${own.name}`].filter(Boolean).join(" | ");

  let transactionId: string | undefined;
  const contributionAmount = b.type === "deposit" ? b.amount : -b.amount;

  await db.transaction(async (tx) => {
    // Tentukan arah transfer berdasarkan type
    let txAccountId: string;
    let txTransferToAccountId: string;

    if (b.type === "deposit") {
      // DEPOSIT: user account -> goal account
      txAccountId = b.accountId;
      txTransferToAccountId = goalAccountId;
    } else {
      // WITHDRAW: goal account -> user account
      txAccountId = goalAccountId;
      txTransferToAccountId = b.accountId;
    }

    // Insert transaction sebagai TRANSFER jika account berbeda
    if (txAccountId !== txTransferToAccountId && !b.transactionId) {
      const [txn] = await tx.insert(transactions).values({
        userId,
        occurredAt: occurredAt,
        amount: String(b.amount),
        type: "transfer",
        accountId: txAccountId,
        transferToAccountId: txTransferToAccountId,
        note: txNote,
      }).returning({ id: transactions.id });

      transactionId = txn.id;

      // update account balance untuk transfer
      await db
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} - ${b.amount}`,
        })
        .where(eq(accounts.id, txAccountId));

      await db
        .update(accounts)
        .set({
          balance: sql`${accounts.balance} + ${b.amount}`,
        })
        .where(eq(accounts.id, txTransferToAccountId));
    } else if (b.transactionId) {
      // Link ke transaction existing, pastikan valid
      const existingTxn = await db.query.transactions.findFirst({
        where: and(eq(transactions.id, b.transactionId), eq(transactions.userId, userId)),
        columns: { id: true }
      });
      if (!existingTxn) throw new BadRequestError("Transaksi tidak ditemukan atau tidak valid.");

      transactionId = existingTxn.id;
    } else {
      transactionId = undefined;
    }

    // Insert goal contribution (positive for deposit, negative for withdraw)
    await tx.insert(goalContributions).values({
      goalId: id,
      userId,
      transactionId,
      occurredAt,
      amount: String(contributionAmount),
      note: b.note ?? null,
    });
  });

  return { ok: true };
});
