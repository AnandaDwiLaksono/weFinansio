import { db } from "@/lib/db";
import { fxRates, userSettings } from "@/lib/db/schema";
import { and, eq, sql, inArray } from "drizzle-orm";

export async function getUserBaseCurrency(userId: string) {
  const s = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
    columns: { baseCurrency: true },
  });
  return s?.baseCurrency ?? "IDR";
}

// ambil rate terakhir per ccy -> base
export async function getFxMap(userId: string, ccys: string[], baseCurrency: string) {
  const uniq = Array.from(new Set(ccys.map((c) => c.toUpperCase()).filter(Boolean)));
  if (uniq.length === 0) return new Map<string, number>();
  // baseCurrency selalu 1
  const map = new Map<string, number>();
  map.set(baseCurrency.toUpperCase(), 1);

  const rows = await db
    .select({
      ccy: fxRates.ccy,
      rateToBase: fxRates.rateToBase,
    })
    .from(fxRates)
    .where(
      and(
        inArray(fxRates.ccy, uniq),
        // optional: userId null (global) atau milik user
        sql`${fxRates.userId} IS NULL OR ${fxRates.userId} = ${userId}`
      )
    );

  for (const r of rows) {
    map.set(r.ccy.toUpperCase(), Number(r.rateToBase || 1));
  }
  return map;
}

export function convertToBase(amount: number, ccy: string, fxMap: Map<string, number>, base: string) {
  const k = ccy.toUpperCase();
  if (k === base.toUpperCase()) return amount;
  const rate = fxMap.get(k) ?? 1;
  return amount * rate;
}
