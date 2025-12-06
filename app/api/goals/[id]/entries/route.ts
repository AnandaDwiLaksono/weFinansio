export const runtime = "nodejs";

import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { goals, goalContributions, users, accounts, categories, transactions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const CreateBody = z.object({
  occurredAt: z.string().optional(), // ISO
  amount: z.number(), // +deposit, -withdraw
  note: z.string().max(200).optional(),
  mirrorTransaction: z.boolean().optional(),
  accountId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
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

  const id = req.url.split('/').filter(Boolean).pop()!;

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

  const id = req.url.split('/').filter(Boolean).pop()!;

  const own = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, userId)),
    columns: { id: true, name: true }
  });
  if (!own) throw new NotFoundError("Goal tidak ditemukan.");

  const b = CreateBody.parse(await req.json());
  if (b.amount === 0) throw new BadRequestError("Nominal tidak boleh 0.");

  const occurredAt = b.occurredAt ? new Date(b.occurredAt) : new Date();

  await db.transaction(async (tx) => {
    // insert ke goal_entries
    await tx.insert(goalContributions).values({
      goalId: id,
      userId,
      occurredAt,
      amount: String(b.amount),
      note: b.note ?? null,
    });

    // jika tidak ingin mirror ke transaksi, selesai
    if (!b.mirrorTransaction) return;

    if (!b.accountId) throw new BadRequestError("accountId wajib saat mirrorTransaction = true.");

    // validasi kepemilikan account & category
    const ownAcc = await tx.query.accounts.findFirst({
      where: and(eq(accounts.id, b.accountId), eq(accounts.userId, userId)),
      columns: { id:true, name:true }
    });
    if (!ownAcc) throw new BadRequestError("Akun tidak valid.");

    if (b.categoryId) {
      const ownCat = await tx.query.categories.findFirst({
        where: and(eq(categories.id, b.categoryId), eq(categories.userId, userId)),
        columns: { id:true }
      });
      if (!ownCat) throw new BadRequestError("Kategori tidak valid.");
    }

    const noteBase = b.note || "";
    const txNote = [noteBase, `Goal: ${own.name}`].filter(Boolean).join(" | ");

    if (b.amount > 0) {
      // DEPOSIT ke goal => catat sebagai expense dengan kategori (jika user ingin track di budget)
      // Ini tetap expense karena goal bukan "account" real, hanya tracking tujuan
      await tx.insert(transactions).values({
        userId,
        occurredAt,
        amount: String(b.amount),
        type: "expense",
        accountId: b.accountId,
        categoryId: b.categoryId ?? null,
        note: txNote,
      });
    } else {
      // WITHDRAW dari goal => uang kembali ke akun (income)
      const val = Math.abs(b.amount);
      await tx.insert(transactions).values({
        userId,
        occurredAt,
        amount: String(val),
        type: "income",
        accountId: b.accountId,
        categoryId: b.categoryId ?? null,
        note: txNote,
      });
    }
  });

  return { ok: true };
});
