import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function getOrCreateUserByEmail(email: string, name?: string | null, image?: string | null) {
  if (!email) throw new Error("Email kosong pada OAuth");

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, email: true, name: true},
    // columns: { id: true, email: true, name: true, image: true },
  });
  if (existing) return existing;

  const [row] = await db.insert(users).values({
    email,
    name: name ?? null,
    // image: image ?? null,
  }).returning({ id: users.id, email: users.email, name: users.name });
  // }).returning({ id: users.id, email: users.email, name: users.name, image: users.image });

  if (!row) throw new Error("Gagal membuat user");
  return row;
}
