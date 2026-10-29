export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  accounts,
  transactions,
  goals,
  goalContributions,
  users,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "@/lib/errors";

const Body = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  occurredAt: z.string(), // ISO
  note: z.string().max(200).optional(),
  clientId: z.string().min(1).max(40).optional(),
  goalContributions: z
    .array(
      z.object({
        goalId: z.string().uuid(),
        amount: z.number().nonnegative(),
      }),
    )
    .optional(),
});

type ExistingTransfer = {
  id: string;
  userId: string;
  occurredAt: string;
  amount: string;
  accountId: string;
  transferToAccountId: string | null;
  note: string | null;
  transferGroupId: string | null;
};

function matchesTransfer(
  existing: ExistingTransfer,
  userId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  occurredAt: string,
  note: string,
) {
  return (
    existing.userId === userId &&
    existing.accountId === fromAccountId &&
    existing.transferToAccountId === toAccountId &&
    Number(existing.amount) === amount &&
    String(existing.occurredAt).slice(0, 10) === occurredAt &&
    (existing.note ?? null) === note
  );
}

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

  const parsedDate = new Date(p.occurredAt);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestError("Tanggal transfer tidak valid.");
  }
  const at = parsedDate.toISOString().slice(0, 10);
  const amountStr = String(p.amount);

  const result = await db.transaction(async (tx) => {
    const [fromAcc, toAcc] = await Promise.all([
      tx.query.accounts.findFirst({
        where: and(
          eq(accounts.id, p.fromAccountId),
          eq(accounts.userId, userId),
        ),
      }),
      tx.query.accounts.findFirst({
        where: and(eq(accounts.id, p.toAccountId), eq(accounts.userId, userId)),
      }),
    ]);
    if (!fromAcc || !toAcc) throw new BadRequestError("Akun tidak valid.");

    const note = p.note ?? `Transfer ke ${toAcc.name}`;
    const selectByClientId = async () => {
      if (!p.clientId) return undefined;
      const [existing] = await tx
        .select({
          id: transactions.id,
          userId: transactions.userId,
          occurredAt: transactions.occurredAt,
          amount: transactions.amount,
          accountId: transactions.accountId,
          transferToAccountId: transactions.transferToAccountId,
          note: transactions.note,
          transferGroupId: transactions.transferGroupId,
        })
        .from(transactions)
        .where(eq(transactions.clientId, p.clientId))
        .limit(1);
      return existing as ExistingTransfer | undefined;
    };

    const existing = await selectByClientId();
    if (existing) {
      if (
        !existing.transferGroupId ||
        !matchesTransfer(
          existing,
          userId,
          p.fromAccountId,
          p.toAccountId,
          p.amount,
          at,
          note,
        )
      ) {
        throw new ConflictError(
          "clientId sudah digunakan untuk transfer lain.",
        );
      }
      const linkedContributions = await tx
        .select({ id: goalContributions.id })
        .from(goalContributions)
        .where(
          and(
            eq(goalContributions.userId, userId),
            eq(goalContributions.transactionId, existing.id),
          ),
        );
      return {
        transferGroupId: existing.transferGroupId,
        linkedGoalsCount: linkedContributions.length,
      };
    }

    const linkedGoals = await tx
      .select({ id: goals.id, name: goals.name })
      .from(goals)
      .where(
        and(
          eq(goals.userId, userId),
          eq(goals.linkedAccountId, p.toAccountId),
          eq(goals.archived, false),
        ),
      );

    let contributions: { goalId: string; amount: number }[] = [];
    if (p.goalContributions && p.goalContributions.length > 0) {
      const linkedGoalIds = new Set(linkedGoals.map((goal) => goal.id));
      const submittedIds = new Set(
        p.goalContributions.map((contribution) => contribution.goalId),
      );
      if (
        submittedIds.size !== p.goalContributions.length ||
        p.goalContributions.some(
          (contribution) => !linkedGoalIds.has(contribution.goalId),
        )
      ) {
        throw new BadRequestError(
          "Kontribusi goal tidak valid untuk akun tujuan transfer.",
        );
      }
      const total = p.goalContributions.reduce(
        (sum, contribution) => sum + contribution.amount,
        0,
      );
      if (Math.abs(total - p.amount) > 0.01) {
        throw new BadRequestError(
          "Total kontribusi goal harus sama dengan nominal transfer.",
        );
      }
      contributions = p.goalContributions.filter(
        (contribution) => contribution.amount > 0,
      );
    } else if (linkedGoals.length > 0) {
      const equalShare = Number((p.amount / linkedGoals.length).toFixed(2));
      contributions = linkedGoals.map((goal, index) => ({
        goalId: goal.id,
        amount:
          index === linkedGoals.length - 1
            ? Number(
                (p.amount - equalShare * (linkedGoals.length - 1)).toFixed(2),
              )
            : equalShare,
      }));
    }

    const transferGroupId = randomUUID();
    const [row] = await tx
      .insert(transactions)
      .values({
        userId,
        occurredAt: at,
        amount: amountStr,
        type: "transfer",
        accountId: p.fromAccountId,
        transferToAccountId: p.toAccountId,
        categoryId: null,
        note,
        transferGroupId,
        clientId: p.clientId ?? null,
      })
      .onConflictDoNothing({ target: transactions.clientId })
      .returning({ id: transactions.id });

    if (!row) {
      // Kunci unik juga melindungi request serentak; jangan ulangi saldo/goal.
      const conflicted = await selectByClientId();
      if (
        conflicted?.transferGroupId &&
        matchesTransfer(
          conflicted,
          userId,
          p.fromAccountId,
          p.toAccountId,
          p.amount,
          at,
          note,
        )
      ) {
        const linkedContributions = await tx
          .select({ id: goalContributions.id })
          .from(goalContributions)
          .where(
            and(
              eq(goalContributions.userId, userId),
              eq(goalContributions.transactionId, conflicted.id),
            ),
          );
        return {
          transferGroupId: conflicted.transferGroupId,
          linkedGoalsCount: linkedContributions.length,
        };
      }
      throw new ConflictError("clientId sudah digunakan untuk transfer lain.");
    }

    const updateBalance = async (
      accountId: string,
      direction: "credit" | "debit",
    ) => {
      const [updated] = await tx
        .update(accounts)
        .set({
          balance:
            direction === "credit"
              ? sql`${accounts.balance} + ${p.amount}`
              : sql`${accounts.balance} - ${p.amount}`,
        })
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .returning({ id: accounts.id });
      if (!updated)
        throw new BadRequestError(
          "Akun tidak ditemukan saat memperbarui saldo.",
        );
    };

    await updateBalance(p.fromAccountId, "debit");
    await updateBalance(p.toAccountId, "credit");

    for (const contribution of contributions) {
      await tx.insert(goalContributions).values({
        goalId: contribution.goalId,
        userId,
        transactionId: row.id,
        amount: String(contribution.amount),
        occurredAt: at,
        note: p.note ?? `Auto (bagi rata) dari transfer ke ${toAcc.name}`,
      });
    }

    return { transferGroupId, linkedGoalsCount: linkedGoals.length };
  });

  return { ok: true, ...result };
});
