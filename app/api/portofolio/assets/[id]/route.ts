export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { assetsMaster, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const UpdateBody = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(500).optional().nullable(),
  issuer: z.string().max(160).optional().nullable(),
  isin: z.string().max(20).optional().nullable(),
  source: z.string().max(50).optional().nullable(),
  note: z.string().optional().nullable(),
  coupon: z.number().positive().max(99.99).optional().nullable(),
  interestRate: z.number().positive().max(99.99).optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  minimumUnit: z.number().positive().optional(),
  decimals: z.number().int().min(0).max(18).optional(),
});

export const PATCH = handleApi(async (req: Request) => {
  const session = await getSession();
  let userId = session?.user?.id;
  if (!userId && session?.user?.email) {
    const u = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (u) userId = u.id;
  }

  if (!userId) throw new UnauthorizedError("No user");

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const own = await db.query.assetsMaster.findFirst({
    where: and(eq(assetsMaster.id, id), eq(assetsMaster.userId, userId)),
    columns: { id: true },
  });
  if (!own) throw new NotFoundError("Aset tidak ditemukan.");

  const body = UpdateBody.parse(await req.json());

  const updateFields: Partial<typeof assetsMaster.$inferInsert> = {};

  if (body.name !== undefined) updateFields.name = body.name;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.issuer !== undefined) updateFields.issuer = body.issuer;
  if (body.isin !== undefined) updateFields.isin = body.isin?.toUpperCase() || null;
  if (body.source !== undefined) updateFields.source = body.source;
  if (body.note !== undefined) updateFields.note = body.note;
  if (body.coupon !== undefined) updateFields.coupon = body.coupon ? body.coupon.toString() : null;
  if (body.interestRate !== undefined) updateFields.interestRate = body.interestRate ? body.interestRate.toString() : null;
  if (body.maturityDate !== undefined) updateFields.maturityDate = body.maturityDate || null;
  if (body.minimumUnit !== undefined) updateFields.minimumUnit = body.minimumUnit.toString();
  if (body.decimals !== undefined) updateFields.decimals = body.decimals;

  await db
    .update(assetsMaster)
    .set(updateFields)
    .where(eq(assetsMaster.id, id));

  return { ok: true };
});

export const DELETE = handleApi(async (req: Request) => {
  const session = await getSession();
  let userId = session?.user?.id;
  if (!userId && session?.user?.email) {
    const u = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
      columns: { id: true },
    });
    if (u) userId = u.id;
  }

  if (!userId) throw new UnauthorizedError("No user");

  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  const own = await db.query.assetsMaster.findFirst({
    where: and(eq(assetsMaster.id, id), eq(assetsMaster.userId, userId)),
    columns: { id: true },
  });
  if (!own) throw new NotFoundError("Aset tidak ditemukan.");

  // Delete from assetsMaster (cascade deletes will automatically delete holdings & transactions)
  await db.delete(assetsMaster).where(eq(assetsMaster.id, id));

  return { ok: true };
});
