import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/signin" }, // akan redirect bila belum login
});

export const config = {
  matcher: [
    "/",                         // dashboard
    "/transactions/:path*",
    "/budgets/:path*",
    "/goals/:path*",
    "/portfolio/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/api/(?!auth).*",           // proteksi semua API kecuali /api/auth/*
  ],
};
