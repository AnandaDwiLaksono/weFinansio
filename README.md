This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

<=============================================================================================================================>

gas! berikut step-by-step inisialisasi proyek kita pakai npm (tanpa pnpm), sesuai stack: Next.js (App Router) + Tailwind + shadcn/ui + Auth.js + Drizzle + PostgreSQL (Neon/Supabase) + PWA (next-pwa) dan deploy ke Vercel.

0) Prasyarat

Node 18+ (disarankan 20/22).

Akun GitHub, Vercel, dan Neon/Supabase.

Terminal Windows (PowerShell / Git Bash).

1) Scaffold project + GitHub
# 1) Buat project Next.js (App Router + Tailwind)
npx create-next-app@latest wefinansio --typescript --app --tailwind --eslint

cd wefinansio

# 2) Init git & commit awal
git init
git add -A
git commit -m "chore: init next app"

# 3) Buat repo GitHub & push (tanpa GitHub CLI)
git branch -M main
git remote add origin https://github.com/<username>/wefinansio.git
git push -u origin main


Mau full JavaScript? ganti flag --typescript jadi --js. (Aku tetap sarankan TS.)

2) Install dependencies (npm)
# UI & komponen
npm i lucide-react class-variance-authority tailwind-merge

# State & data fetching + offline persist
npm i @tanstack/react-query @tanstack/react-query-persist-client idb zustand

# Form & validasi
npm i zod react-hook-form @hookform/resolvers

# Auth
npm i next-auth

# ORM + driver Postgres + migrasi
npm i drizzle-orm drizzle-kit pg

# PWA
npm i next-pwa

# Charts & table
npm i recharts @tanstack/react-table

# Observabilitas
npm i @vercel/analytics

3) shadcn/ui + komponen dasar
npx shadcn@latest init
# jawab: App Router, TS, Tailwind

# Tambah komponen yang sering dipakai
npx shadcn@latest add button card input label textarea select badge dialog sheet dropdown-menu toast avatar

4) Setup PWA (next-pwa)

next.config.js

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});
module.exports = withPWA({
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
});


public/manifest.json

{
  "name": "weFinansio",
  "short_name": "weFinansio",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B2E6D",
  "theme_color": "#2F80ED",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}


Buat ikon cepat (opsional): npx pwa-asset-generator public/logo.png public/icons -i public/manifest.json

5) Struktur folder (ringkas)
/app
  /(auth)/sign-in/page.tsx
  /(auth)/sign-up/page.tsx
  /dashboard/page.tsx
  /api/auth/[...nextauth]/route.ts
  /api/transactions/route.ts
  /api/portfolio/route.ts
/lib
  /db/schema.ts
  /db/index.ts
  queryClient.ts
  idbPersist.ts
/components

6) Database: Neon/Supabase + Drizzle
6.1 Buat DB & ambil connection string

Neon → New Project → ambil postgresql://...

Supabase → Settings → Database → Connection string

Pastikan ada sslmode=require untuk koneksi dari Vercel.

6.2 Konfigurasi Drizzle

drizzle.config.ts

import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});


lib/db/schema.ts (contoh minimal; lanjutan bisa ikuti ERD)

import { pgTable, text, timestamp, uuid, numeric, pgEnum } from "drizzle-orm/pg-core";

export const txType = pgEnum('tx_type', ['expense','income','transfer']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  currency: text('currency_code').notNull().default('IDR'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  accountId: uuid('account_id').notNull(),
  type: txType('type').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull(), // selalu positif
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  note: text('note'),
  clientId: text('client_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});


lib/db/index.ts

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }));

6.3 ENV & migrasi

Buat .env.local:

DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="(isi random 32+ char)"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""


Generate & apply migrasi:

npx drizzle-kit generate
npx drizzle-kit migrate

7) Auth.js (NextAuth) – Google OAuth

Buat OAuth Client di Google Cloud → masukkan redirect:

http://localhost:3000/api/auth/callback/google

https://<project>.vercel.app/api/auth/callback/google (nanti untuk prod)

app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID!, clientSecret: process.env.AUTH_GOOGLE_SECRET! })
  ],
  secret: process.env.AUTH_SECRET,
});
export { handler as GET, handler as POST };

8) React Query + persist (offline cache)

lib/queryClient.ts

import { QueryClient } from "@tanstack/react-query";
export const queryClient = new QueryClient();


lib/idbPersist.ts

import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryClient } from "./queryClient";

export function enableQueryPersistence() {
  if (typeof window === "undefined") return;
  const persister = createSyncStoragePersister({ storage: window.localStorage });
  persistQueryClient({ queryClient, persister, maxAge: 1000 * 60 * 60 * 24 });
}


Gunakan QueryClientProvider di layout client dan panggil enableQueryPersistence() di client.

9) Contoh API route

app/api/transactions/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export async function GET() {
  const rows = await db.select().from(transactions).limit(100);
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  await db.insert(transactions).values(body);
  return NextResponse.json({ ok: true });
}

10) Scripts di package.json

Tambahkan agar enak dipakai:

{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:gen": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}

11) Vercel: deploy

Import repo GitHub ke Vercel → Framework: Next.js (default).

Set Environment Variables untuk Production & Preview:

DATABASE_URL

AUTH_SECRET

AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET

(opsional) NEXT_PUBLIC_*

Deploy.

Migrate DB prod: jalankan di lokal dengan pointing ke DB prod (sementara copy DATABASE_URL prod ke .env.local), lalu:

npx drizzle-kit generate
npx drizzle-kit migrate


(Atau siapkan workflow khusus, tapi cara manual ini aman & sederhana.)

Verifikasi PWA (open site prod → Chrome → “Install app”).

12) (Opsional) Vercel Cron & harga aset

Tambah endpoint /api/sync/reconcile atau /api/prices/refresh.

Di Vercel → Settings → Cron Jobs → jadwalkan (mis. 0 * * * *).

13) Jalan lokal
npm run dev
# buka http://localhost:3000

Checklist cepat

 .env.local lengkap & tidak di-commit.

 Migrasi sukses (/drizzle berisi SQL).

 Redirect Google OAuth (local & prod) sudah benar.

 manifest.json & ikon PWA ada.

 Vercel env sudah diisi, deploy hijau.

Kalau mau, aku bisa lanjut bikinin branch starter (auth + PWA + Drizzle + contoh modal “Tambah Transaksi” + offline queue dasar) agar kamu tinggal koding fitur.
