"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { ReactQueryProvider } from "@/lib/react-query";

export default function Providers({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <ReactQueryProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </ReactQueryProvider>
    </SessionProvider>
  );
}
