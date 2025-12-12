"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { useEffect } from "react";

import { ReactQueryProvider } from "@/lib/react-query";
import { initOnlineAutoFlush } from "@/lib/offline-queue";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Read theme from localStorage and apply to HTML element
    const theme = window.localStorage.getItem("wefinansio_theme_mode");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "wefinansio_theme_mode") {
        if (e.newValue === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return <>{children}</>;
}

export default function Providers({
  children
}: {
  children: React.ReactNode
}) {
  useEffect(() => { initOnlineAutoFlush(); }, []);
  return (
    <SessionProvider>
      <ReactQueryProvider>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </ReactQueryProvider>
    </SessionProvider>
  );
}
