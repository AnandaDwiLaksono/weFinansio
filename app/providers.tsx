"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useEffect } from "react";

import { ReactQueryProvider } from "@/lib/react-query";
import { initOnlineAutoFlush } from "@/lib/offline-queue";

export default function Providers({
  children
}: {
  children: React.ReactNode
}) {
  useEffect(() => { initOnlineAutoFlush(); }, []);
  return (
    <SessionProvider>
      <ReactQueryProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </ReactQueryProvider>
    </SessionProvider>
  );
}
