"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, LayoutDashboard, ListPlus, Target, PieChart, LineChart, Layers } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ListPlus },
  { href: "/portofolio", label: "Portofolio", icon: PieChart },
  { href: "/accounts", label: "Akun", icon: Wallet },
  { href: "/categories", label: "Kategori", icon: Layers },
  { href: "/budgets", label: "Budget", icon: PieChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reports", label: "Laporan", icon: LineChart },
];

export default function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <div className={cn("h-dvh flex flex-col transition-all duration-300", collapsed && "items-center")}>
      <div className={cn("flex items-center p-4 transition-all duration-300", collapsed ? "justify-center" : "justify-between gap-2")}>
        <div className={"flex items-center gap-2 transition-all duration-300"}>
          <Image src="/icons/wefinansio_logo_bluegrad_icon.png" alt="weFinansio" width={28} height={28} className="transition-all duration-300" />
          <span className={cn("font-semibold text-lg transition-all duration-300", collapsed && "opacity-0 w-0 overflow-hidden")}>
            weFinansio
          </span>
        </div>
      </div>

      <div className={cn("mx-4 border-t border-gray-300 transition-all duration-300", collapsed && "mx-0 w-3/4")}></div>

      <nav className={cn("flex-1 px-2 py-3 space-y-1 w-full transition-all duration-300", collapsed && "px-2")}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-300", collapsed ? "justify-center" : "gap-3",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 transition-all duration-300" />
              <span className={cn("truncate transition-all duration-300", collapsed && "opacity-0 w-0 overflow-hidden")}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("p-3 text-xs text-muted-foreground transition-all duration-300", collapsed && "text-center p-2")}>v0.1.0</div>
    </div>
  );
}
