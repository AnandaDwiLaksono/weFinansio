"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, ChevronLeft, ChevronRight, Settings, Power } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transaksi" },
  { href: "/portofolio", label: "Portofolio" },
  { href: "/accounts", label: "Akun" },
  { href: "/categories", label: "Kategori" },
  { href: "/budgets", label: "Budget" },
  { href: "/goals", label: "Goals" },
  { href: "/reports", label: "Laporan" },
];

export default function HeaderBar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { data } = useSession();
  const pathname = usePathname();

  const [openSheet, setOpenSheet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  
  const ToggleIcon = collapsed ? ChevronRight : ChevronLeft;

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          className="transition-all duration-300 cursor-pointer lg:hidden max-md:hidden"
        >
          <ToggleIcon className="h-5 w-5 transition-all duration-300" />
        </Button>
        
        {/* Mobile sidebar toggle */}
        <Sheet open={openSheet} onOpenChange={setOpenSheet}>
          <SheetTrigger asChild className="md:hidden mr-2">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <Sidebar collapsed={false} />
          </SheetContent>
        </Sheet>

        <h1 className="text-2xl font-semibold">{items.find(item => item.href === pathname)?.label}</h1>

        <div className="ml-auto" />
        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2"
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <div className="flex items-center gap-2">
              {data?.user?.image ? (
                <Image
                  src={data.user.image}
                  alt={data.user.name ?? "User"}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {(data?.user?.name || "U").slice(0,1)}
                </div>
              )}
              <span className="text-sm font-medium max-w-[160px] truncate">{data?.user?.name}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
          {menuOpen && (
            <div className="absolute right-0 mt-6 w-64 rounded-xl border bg-popover shadow-lg p-3 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center gap-3 mb-3">
                {data?.user?.image ? (
                  <Image
                    src={data.user.image}
                    alt={data.user.name ?? "User"}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {(data?.user?.name || "U").slice(0,1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">{data?.user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{data?.user?.email}</p>
                </div>
              </div>
              <div className="my-2 border-t border-gray-300"></div>
              <div className="space-y-1">
                <Link
                  href="/settings"
                  title="Pengaturan"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center rounded-lg px-2 py-1.5 text-sm transition-all duration-300 justify-start gap-2 hover:bg-muted hover:text-foreground"
                >
                  <Settings className="h-4.5 w-4.5 transition-all duration-300" />
                  <span className="truncate transition-all duration-300">
                    Pengaturan
                  </span>
                </Link>
                <Link
                  href="#"
                  title="Keluar"
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                  className="flex items-center rounded-lg px-2 py-1.5 text-sm transition-all duration-300 justify-start gap-2 hover:bg-muted text-destructive"
                >
                  <Power className="h-4.5 w-4.5 transition-all duration-300" />
                  <span className="truncate transition-all duration-300">
                    Keluar
                  </span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
