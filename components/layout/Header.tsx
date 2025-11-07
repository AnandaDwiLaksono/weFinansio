"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Sidebar from "./Sidebar";
import AddTransactionModal from "@/components/AddTransactionModal";
import AddAccountModal from "@/components/AddAccountModal";
import { Menu } from "lucide-react";

export default function HeaderBar() {
  const { data } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2 px-4 py-3 md:px-6">
        {/* Mobile sidebar toggle */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <Sidebar />
          </SheetContent>
        </Sheet>

        <div className="font-semibold">Dashboard</div>
        <div className="ml-auto flex items-center gap-2">
          <AddTransactionModal 
            accounts={[]} 
            categories={[]} 
            userId={data?.user?.id ?? ""} 
          />
          <AddAccountModal />
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/signin" })}>
            Keluar
          </Button>
          {/* {data?.user?.image && (
            <Image
              src={data.user.image}
              alt={data.user.name ?? "User"}
              width={28}
              height={28}
              className="rounded-full"
            />
          )} */}
        </div>
      </div>
    </header>
  );
}
