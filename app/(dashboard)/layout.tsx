"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import HeaderBar from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <div className={`grid ${collapsed ? "md:grid-cols-[72px_1fr]" : "md:grid-cols-[260px_1fr]"}`}>
        {/* Sidebar desktop */}
        <aside className="hidden md:block border-r h-screen sticky top-0 transition-all duration-200">
          <Sidebar collapsed={collapsed} />
        </aside>

        {/* Konten */}
        <div className="flex min-h-dvh flex-col">
          <HeaderBar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
