export const runtime = "nodejs";

import { z } from "zod";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, transactions, goals, goalContributions, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";

const Body = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  occurredAt: z.string(), // ISO
  note: z.string().max(200).optional(),
  goalContributions: z.array(z.object({
    goalId: z.string().uuid(),
    amount: z.number().nonnegative(),
  })).optional(),
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

  let linkedGoalsCount = 0;

  // dua baris transaksi (atomic) dengan type "transfer"
  await db.transaction(async (tx) => {
    // Transaksi keluar dari akun sumber
    await tx.insert(transactions).values({
      userId,
      occurredAt: at,
      amount: amountStr,
      type: "transfer",
      accountId: p.fromAccountId,
      transferToAccountId: p.toAccountId,
      categoryId: null,
      note: p.note ?? `Transfer ke ${toAcc.name}`,
      transferGroupId: gid,
    });
    // Transaksi masuk ke akun tujuan
    await tx.insert(transactions).values({
      userId,
      occurredAt: at,
      amount: amountStr,
      type: "transfer",
      accountId: p.toAccountId,
      transferToAccountId: p.fromAccountId,
      categoryId: null,
      note: p.note ?? `Transfer dari ${fromAcc.name}`,
      transferGroupId: gid,
    });

    // Auto-contribute to goals linked to destination account
    const linkedGoals = await tx.query.goals.findMany({
      where: and(
        eq(goals.userId, userId),
        eq(goals.linkedAccountId, p.toAccountId),
        eq(goals.archived, false)
      ),
      columns: { id: true, name: true }
    });

    if (linkedGoals.length > 0) {
      linkedGoalsCount = linkedGoals.length;
      // Use manual split if provided, otherwise equal split
      if (p.goalContributions && p.goalContributions.length > 0) {
        // Manual split: use amounts from client
        for (const contrib of p.goalContributions) {
          if (contrib.amount > 0) {
            await tx.insert(goalContributions).values({
              goalId: contrib.goalId,
              userId,
              transactionId: null,
              amount: String(contrib.amount),
              occurredAt: at.toISOString().split('T')[0],
              note: p.note ?? `Transfer ke ${toAcc.name}`,
            });
          }
        }
      } else {
        // Equal split: divide equally among all linked goals
        const splitAmount = p.amount / linkedGoals.length;
        for (const goal of linkedGoals) {
          await tx.insert(goalContributions).values({
            goalId: goal.id,
            userId,
            transactionId: null,
            amount: String(splitAmount),
            occurredAt: at.toISOString().split('T')[0],
            note: p.note ?? `Auto (bagi rata) dari transfer ke ${toAcc.name}`,
          });
        }
      }
    }
  });

  return { ok: true, transferGroupId: gid, linkedGoalsCount };
});
