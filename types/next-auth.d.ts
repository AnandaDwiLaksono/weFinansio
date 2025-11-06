import NextAuth, { DefaultSession } from "next-auth";

// Tambah field `id` ke Session.user
declare module "next-auth" {
  // interface Session {
  //   user: DefaultSession["user"] & {
  //     id: string;
  //   };
  // }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  // Pastikan User (yang direturn dari authorize / adapter) punya id
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}

// Tambah properti yang kita pakai di token JWT
declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;   // id user di DB kita
    sub?: string;      // bawaan NextAuth, tapi kita pastikan ada
    picture?: string;  // opsional (dipakai di callback Google)
  }
}
