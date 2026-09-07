<div align="center">

# 💳 weFinansio

**Aplikasi Manajemen Keuangan Pribadi Modern & Offline-First**

[Live Demo](https://wefinansio.zozoadl.com) • [Fitur](#-fitur-utama) • [Tech Stack](#-tech-stack) • [Cara Install](#-memulai)

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

</div>

---

## 📌 Ikhtisar

**weFinansio** adalah aplikasi pelacak keuangan personal yang dirancang cepat, responsif, dan fleksibel. Mendukung manajemen anggaran berbasis siklus gajian dinamis, pelacakan arus kas multi-akun, serta kapabilitas offline-first.

---

## ✨ Fitur Utama

- 📊 **Dashboard & Analitik:** Ringkasan arus kas bulanan, kartu KPI interaktif, dan grafik visualisasi pengeluaran.
- 🎯 **Budgeting Dinamis:** Penyesuaian periode anggaran berdasarkan tanggal gajian pengguna (`startDatePeriod`) beserta fitur *carryover* sisa budget.
- ⚡ **Offline-First:** Sinkronisasi state lokal IndexedDB via TanStack Query Persister untuk akses tanpa koneksi internet.
- 💼 **Multi-Akun & Transaksi:** Kelola dompet/rekening, pencatatan transaksi masuk/keluar, dan transfer antar akun.
- 🏷️ **Kategorisasi Kustom:** Pengelompokan pengeluaran dan pemasukan secara terstruktur.

---

## 🛠️ Tech Stack

| Kategori | Teknologi |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19 |
| **Styling** | Tailwind CSS v4, Radix UI, Lucide Icons |
| **Database & ORM** | PostgreSQL, Drizzle ORM |
| **State & Cache** | TanStack Query v5 (Persister), Zustand |
| **Autentikasi** | NextAuth.js |
| **Pengujian** | Vitest, Playwright |

---

## 🚀 Memulai

### 1. Prasyarat
- **Node.js** >= 20.x
- **PostgreSQL** database

### 2. Instalasi & Setup
```bash
git clone https://github.com/user/wefinansio.git
cd wefinansio
npm install
```

### 3. Konfigurasi Environment
Buat file `.env.local` pada root direktori:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/wefinansio"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Migrasi Database
```bash
npm run db:migrate-local
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Akses di `http://localhost:3000`.

---

## 📜 Skrip npm

- `npm run dev` — Server pengembangan (Turbopack)
- `npm run build` — Build produksi
- `npm run db:gen` — Generate file migrasi Drizzle
- `npm run db:migrate` — Jalankan migrasi database
- `npm run test` — Unit test (Vitest)
- `npm run test:e2e` — End-to-end test (Playwright)

---

<div align="center">
  Made with ❤️ for smart personal finance.
</div>
