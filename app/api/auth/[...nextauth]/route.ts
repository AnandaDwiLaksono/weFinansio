import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async jwt({ token, user, profile }) {
      // Saat login baru, copy id user -> token.sub
      if (user?.id) {
        token.sub = String(user.id || token.sub);
      }

      // (opsional) simpan avatar dari Google
      if (profile && "picture" in profile && typeof profile.picture === "string") {
        token.picture = profile.picture;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        // Berkat module augmentation, ini legal & typed
        session.user.id = token.sub;
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
