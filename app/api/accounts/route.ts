export const runtime = "nodejs";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import { handleApi } from "@/lib/http";
import { parseJson } from "@/lib/validate";

const Create = z.object({
  name: z.string().min(2).max(80),
  type: z.enum(["cash","bank","ewallet","investment"]),
  currencyCode: z.string().length(3).default("IDR"),
});

export const GET = handleApi(async () => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new UnauthorizedError();

  const rows = await db.query.accounts.findMany({
    where: eq(accounts.userId, userId),
    orderBy: accounts.createdAt,
    columns: { id:true, name:true, type:true, currencyCode:true, createdAt:true }
  });
  return { items: rows };
});

export const POST = handleApi(async (req: Request) => {
  const session = await getSession();
  const userId = session?.user.id;
  if (!userId) throw new UnauthorizedError();

  const data = await parseJson(req, Create);

  // opsional: cegah duplikat nama per user
  const exists = await db.query.accounts.findFirst({
    where: and(eq(accounts.userId, userId), eq(accounts.name, data.name)),
    columns: { id: true }
  });
  if (exists) throw new ConflictError("Nama akun sudah dipakai.");

  const [row] = await db.insert(accounts).values({
    userId, name: data.name, type: data.type, currencyCode: data.currencyCode
  }).returning({ id: accounts.id });

  return { id: row?.id };
});
