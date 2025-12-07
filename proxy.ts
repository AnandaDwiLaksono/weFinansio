import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/signin" }, // akan redirect bila belum login
});

export const config = {
  matcher: [
    "/",                         // dashboard
    "/accounts/:path*",
    "/budgets/:path*",
    "/categories/:path*",
    "/goals/:path*",
    "/portfolio/:path*",
    "/reconcile/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/transactions/:path*",
    "/api/((?!auth).*)",           // proteksi semua API kecuali /api/auth/*
  ],
};
