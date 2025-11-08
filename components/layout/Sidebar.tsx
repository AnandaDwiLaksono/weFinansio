"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wallet, LayoutDashboard, ListPlus, Target, PieChart, Settings, LineChart, Layers } from "lucide-react";
import Image from "next/image";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ListPlus },
  { href: "/portofolio", label: "Portofolio", icon: PieChart },
  { href: "/accounts", label: "Akun", icon: Wallet },
  { href: "/categories", label: "Kategori", icon: Layers },
  { href: "/budgets", label: "Budget", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reports", label: "Laporan", icon: LineChart },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="h-dvh flex flex-col">
      <div className="flex items-center gap-2 p-4">
        <Image src="/icons/wefinansio_logo_bluegrad_icon.png" alt="weFinansio" width={28} height={28} />
        <span className="font-semibold text-lg">weFinansio</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-xs text-muted-foreground">v0.1.0</div>
    </div>
  );
}
