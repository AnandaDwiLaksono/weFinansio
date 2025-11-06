import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getOrCreateUserByEmail } from "@/lib/auth-db";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",   // ← selalu munculkan chooser
          // access_type: "offline",   // (opsional) kalau butuh refresh_token
          // include_granted_scopes: "true",
        },
      },
    }),

    // === Credentials (email + password) ===
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(creds) {
        const email = (creds?.email || "").toLowerCase().trim();
        const password = String(creds?.password || "");

        // cari user
        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = rows[0];
        if (!user || !user.passwordHash) return null;

        // verifikasi hash
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: String(user.id), email: user.email, name: user.name ?? "" };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin", // gunakan halaman kustom
  },
  callbacks: {
    async jwt({ token, user, profile, account }) {
      // Saat login baru, copy id user -> token.sub
      if (user?.id) {
        token.uid = String(user.id || token.uid);
      }

      // (opsional) simpan avatar dari Google
      if (profile && "picture" in profile && typeof profile.picture === "string") {
        token.picture = profile.picture;
      }

      // Case: login via Google OAuth
      if (account?.provider === "google") {
        // token sudah punya email/name/picture dari Google
        const dbUser = await getOrCreateUserByEmail(
          token.email as string,
          token.name as string | undefined,
          (token.picture as string | undefined) ?? null
        );
        token.uid = dbUser.id;          // ← simpan id DB ke JWT
        return token;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.uid) {
        // Berkat module augmentation, ini legal & typed
        session.user.id = token.uid;
      }
      if (session.user && token.picture) {
        session.user.image = token.picture;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };

// cukup re-export langsung
// export { GET, POST } from "@/auth";
