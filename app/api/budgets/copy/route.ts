export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { handleApi } from "@/lib/http";
import { BadRequestError, UnauthorizedError } from "@/lib/errors";

const Q = z.object({
  from: z.string().regex(/^\d{4}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}$/),
  overwrite: z.coerce.boolean().optional(),
});

export const POST = handleApi(async (req: Request) => {
  const session = await getSession(); const userId = session?.user?.id;
  if (!userId) throw new UnauthorizedError();
  const { from, to, overwrite } = Q.parse(Object.fromEntries(new URL(req.url).searchParams));
  if (from === to) throw new BadRequestError("Periode asal & tujuan tidak boleh sama.");

  const src = await db.query.budgets.findMany({
    where: and(eq(budgets.userId, userId), eq(budgets.periodMonth, from)),
    columns: { categoryId:true, amount:true, carryover:true }
  });
  if (src.length === 0) return { ok: true, copied: 0 };

  const dstExist = await db.query.budgets.findMany({
    where: and(eq(budgets.userId, userId), eq(budgets.periodMonth, to)),
    columns: { categoryId:true, id:true }
  });
  const existMap = new Map(dstExist.map(d => [d.categoryId, d.id]));

  let copied = 0;
  await db.transaction(async (tx) => {
    for (const s of src) {
      const existsId = existMap.get(s.categoryId);
      if (existsId && !overwrite) continue;
      if (existsId && overwrite) {
        await tx.update(budgets).set({ amount: s.amount, carryover: s.carryover }).where(eq(budgets.id, existsId));
        copied++;
      } else {
        await tx.insert(budgets).values({
          userId,
          categoryId: s.categoryId,
          periodMonth: to,
          amount: s.amount,
          carryover: s.carryover,
        });
        copied++;
      }
    }
  });

  return { ok: true, copied };
});
