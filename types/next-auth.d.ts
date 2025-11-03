import { DefaultSession } from "next-auth";

// Tambah field `id` ke Session.user
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
  }

  // Pastikan User (yang direturn dari authorize / adapter) punya id
  interface User {
    id: string;
  }
}

// Tambah properti yang kita pakai di token JWT
declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;      // bawaan NextAuth, tapi kita pastikan ada
    picture?: string;  // opsional (dipakai di callback Google)
  }
}
