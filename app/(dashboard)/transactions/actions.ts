"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions, accounts, categories } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { and, eq } from "drizzle-orm";

const Schema = z.object({
  occurredAt: z.string().min(1),
  amount: z.string().min(1),
  type: z.enum(["income","expense"]),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
});

export async function createTransaction(formData: FormData) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return { ok:false, error:"UNAUTHORIZED" };

  const raw = {
    occurredAt: String(formData.get("occurredAt") || ""),
    amount: String(formData.get("amount") || ""),
    type: String(formData.get("type") || ""),
    accountId: String(formData.get("accountId") || ""),
    categoryId: (formData.get("categoryId") ? String(formData.get("categoryId")) : null),
    notes: (formData.get("notes") ? String(formData.get("notes")) : null),
  };
  const p = Schema.safeParse(raw);
  if (!p.success) return { ok:false, error:"VALIDATION", details:p.error.flatten() };

  // kepemilikan
  const ownAcc = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, p.data.accountId), eq(accounts.userId, userId)),
    columns: { id:true }
  });
  if (!ownAcc) return { ok:false, error:"INVALID_ACCOUNT" };

  if (p.data.categoryId) {
    const ownCat = await db.query.categories.findFirst({
      where: and(eq(categories.id, p.data.categoryId), eq(categories.userId, userId)),
      columns: { id:true }
    });
    if (!ownCat) return { ok:false, error:"INVALID_CATEGORY" };
  }

  await db.insert(transactions).values({
    userId,
    occurredAt: new Date(p.data.occurredAt).toISOString().split("T")[0],
    amount: p.data.amount, // string numeric
    type: p.data.type,
    accountId: p.data.accountId,
    categoryId: p.data.categoryId ?? null,
    note: p.data.notes ?? null,
  });

  // Refresh page & daftar
  revalidatePath("/transactions");
  revalidatePath("/"); // dashboard summary
  return { ok:true };
}
