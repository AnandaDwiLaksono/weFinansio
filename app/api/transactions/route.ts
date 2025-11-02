export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, accounts, categories } from "@/lib/db/schema";

const TxSchema = z.object({
  accountId: z.uuid(),
  categoryId: z.uuid().nullable().optional(),
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  occurredAt: z.string().or(z.date()).transform((v) => new Date(v as string | Date)),
  note: z.string().max(500).optional(),
});

export async function GET() {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(transactions.occurredAt);
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  let data;
  try {
    data = TxSchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, message: "Validasi gagal", issues: e instanceof z.ZodError ? e.issues : undefined }, { status: 400 });
  }

  // === Validasi kepemilikan account
  const acc = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, data.accountId), eq(accounts.userId, userId)),
    columns: { id: true },
  });
  if (!acc) {
    return NextResponse.json({ ok: false, message: "Akun tidak ditemukan / bukan milik Anda" }, { status: 403 });
  }

  // === Validasi kepemilikan kategori (bila ada)
  if (data.categoryId) {
    const cat = await db.query.categories.findFirst({
      where: and(eq(categories.id, data.categoryId), eq(categories.userId, userId)),
      columns: { id: true },
    });
    if (!cat) {
      return NextResponse.json({ ok: false, message: "Kategori tidak ditemukan / bukan milik Anda" }, { status: 403 });
    }
  }

  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId ?? null,
      type: data.type,
      amount: data.amount,
      occurredAt: data.occurredAt,
      note: data.note ?? null,
      syncStatus: "synced",
    })
    .returning({ id: transactions.id });

  return NextResponse.json({ ok: true, id: row?.id }, { status: 201 });
}
