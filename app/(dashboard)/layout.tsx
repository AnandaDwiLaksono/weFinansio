import type { ReactNode } from "react";

import Sidebar from "@/components/layout/Sidebar";
import HeaderBar from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="grid md:grid-cols-[260px_1fr]">
        {/* Sidebar desktop */}
        <aside className="hidden md:block border-r">
          <Sidebar />
        </aside>

        {/* Konten */}
        <div className="flex min-h-dvh flex-col">
          <HeaderBar />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
