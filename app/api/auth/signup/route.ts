export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { tokenBucketAllow } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

const SignUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  // key berdasarkan IP (fallback ke 'unknown')
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || (req as Request & { ip?: string }).ip || "unknown";

  if (!tokenBucketAllow({ key: `signup:${ip}`, capacity: 5, refillRate: 1/10 })) {
    // capacity 5, refill 1 token tiap 10 detik (≈ 30/min)
    return NextResponse.json({ ok: false, message: "Terlalu banyak percobaan, coba lagi nanti." }, { status: 429 });
  }

  try {
    const json = await req.json();
    const body = SignUpSchema.parse(json);

    // cek email sudah ada?
    const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (exists.length > 0) {
      return NextResponse.json({ ok: false, message: "Email sudah terdaftar." }, { status: 409 });
    }

    const hash = await bcrypt.hash(body.password, 12);
    const [row] = await db.insert(users).values({
      email: body.email,
      name: body.name,
      passwordHash: hash,
      currencyCode: "IDR",
    }).returning({ id: users.id, email: users.email, name: users.name });

    return NextResponse.json({ ok: true, user: row }, { status: 201 });
  } catch (e: unknown) {
    // Zod error
    if (e && typeof e === 'object' && 'issues' in e) {
      return NextResponse.json({ ok: false, message: "Validasi gagal", issues: (e as z.ZodError).issues }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: "Gagal mendaftar" }, { status: 500 });
  }
}
