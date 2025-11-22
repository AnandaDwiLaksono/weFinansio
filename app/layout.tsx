import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "weFinansio",
  description: "weFinansio — catat transaksi, kelola anggaran, dan capai tujuan finansial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#2F80ED" />
        <meta name="description" content="weFinansio — catat transaksi, kelola anggaran, dan capai tujuan finansial." />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/manifest-icon-192.maskable.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" sizes="180x180" type="image/png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
