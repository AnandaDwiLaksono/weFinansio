export const runtime = "nodejs";

import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { handleApi } from "@/lib/http";
import { NotFoundError, BadRequestError } from "@/lib/errors";

const Body = z.object({
  token: z.string().min(1, "Token tidak valid"),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
});

export const POST = handleApi(async (req: Request) => {
  const body = Body.parse(await req.json());

  // Cari user berdasarkan email
  const user = await db.query.users.findFirst({
    where: eq(users.email, body.email),
    columns: { id: true, email: true },
  });

  if (!user) {
    throw new NotFoundError("Email tidak ditemukan");
  }

  // Validasi token dari database
  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, body.token),
      eq(passwordResetTokens.userId, user.id),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
    columns: { id: true, usedAt: true },
  });

  if (!resetToken) {
    throw new BadRequestError("Token tidak valid atau sudah kedaluwarsa");
  }

  // Cek apakah token sudah pernah digunakan
  if (resetToken.usedAt) {
    throw new BadRequestError("Token sudah pernah digunakan");
  }

  // Hash password baru
  const passwordHash = await bcrypt.hash(body.password, 10);

  // Update password user
  await db
    .update(users)
    .set({ 
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Tandai token sebagai sudah digunakan
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return {
    message: "Password berhasil direset. Silakan login dengan password baru Anda.",
  };
});
