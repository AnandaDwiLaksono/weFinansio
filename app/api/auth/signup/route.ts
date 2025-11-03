export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { tokenBucketAllow } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { handleApi } from "@/lib/http";
import { BadRequestError, ConflictError, InternalServerError, RateLimitError } from "@/lib/errors";
import { parseJson } from "@/lib/validate";

const SignUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const POST = handleApi(async (req: Request) => {
  // key berdasarkan IP (fallback ke 'unknown')
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || (req as Request & { ip?: string }).ip || "unknown";

  if (!tokenBucketAllow({ key: `signup:${ip}`, capacity: 5, refillRate: 1/10 })) {
    // capacity 5, refill 1 token tiap 10 detik (≈ 30/min)
    throw new RateLimitError("Terlalu banyak percobaan, coba lagi nanti.");
  }

  try {
    const body = await parseJson(req, SignUpSchema);

    // cek email sudah ada?
    const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (exists.length > 0) {
      throw new ConflictError("Email sudah terdaftar.");
    }

    const hash = await bcrypt.hash(body.password, 12);
    const [row] = await db.insert(users).values({
      email: body.email,
      name: body.name,
      passwordHash: hash,
      currencyCode: "IDR",
    }).returning({ id: users.id, email: users.email, name: users.name });

    if (!row) {
      throw new BadRequestError("Gagal membuat akun.");
    }

    return NextResponse.json({ ok: true, user: row }, { status: 201 });
  } catch (e: unknown) {
    // Zod error
    if (e && typeof e === 'object' && 'issues' in e) {
      throw new BadRequestError("Validasi gagal", (e as z.ZodError).issues);
    }
    
    throw new InternalServerError("Gagal mendaftar", e);
  }
});
