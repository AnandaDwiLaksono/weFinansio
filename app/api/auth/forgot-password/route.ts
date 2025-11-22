export const runtime = "nodejs";

import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { handleApi } from "@/lib/http";
import { NotFoundError } from "@/lib/errors";

const resend = new Resend(process.env.RESEND_API_KEY);

const Body = z.object({
  email: z.string().email("Email tidak valid"),
});

export const POST = handleApi(async (req: Request) => {
  const body = Body.parse(await req.json());

  // Cari user berdasarkan email
  const user = await db.query.users.findFirst({
    where: eq(users.email, body.email),
    columns: { id: true, email: true, name: true },
  });

  if (!user) {
    throw new NotFoundError("Email tidak terdaftar");
  }

  // Hapus token lama yang belum digunakan untuk user ini
  await db.delete(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt)
      )
    );

  // Generate reset token
  const resetToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam dari sekarang

  // Simpan token ke database
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token: resetToken,
    expiresAt,
  });

  // Buat reset link
  const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

  // Kirim email dengan Resend
  try {
    await resend.emails.send({
      from: 'weFinansio <noreply@wefinansio.com>', // Ganti dengan domain verified Anda
      to: user.email,
      subject: 'Reset Password - weFinansio',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2F80ED 0%, #1E5FCC 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #2F80ED; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Reset Password</h1>
            </div>
            <div class="content">
              <p>Halo <strong>${user.name || 'User'}</strong>,</p>
              <p>Anda menerima email ini karena ada permintaan untuk reset password akun weFinansio Anda.</p>
              <p>Klik tombol berikut untuk reset password:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </p>
              <p>Atau copy link berikut ke browser Anda:</p>
              <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 4px; font-size: 12px;">${resetLink}</p>
              <p><strong>Link ini akan kedaluwarsa dalam 1 jam.</strong></p>
              <p>Jika Anda tidak meminta reset password, abaikan email ini dan password Anda tidak akan berubah.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} weFinansio. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    // Tetap return success untuk keamanan (jangan expose apakah email exist atau tidak)
  }

  return {
    message: "Link reset password telah dikirim ke email Anda",
  };
});
