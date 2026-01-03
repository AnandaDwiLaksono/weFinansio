"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import TransactionModal from "@/components/TransactionModal";

export default function FabAdd() {
  // You'll need to provide actual accounts, categories, and userId data
  const accounts = [{ id: "1", name: "Cash" }]; // Replace with actual accounts data
  const categories: { id: string; name: string; kind: "expense" | "income" }[] = [{ id: "1", name: "Food", kind: "expense" }]; // Replace with actual categories data

  return (
    <div className="md:hidden fixed bottom-16 right-4 z-40">
      <TransactionModal
        asChild
        type ="add"
        accounts={accounts ?? []}
        categories={categories ?? []}
        id=""
      >
        <Button className="h-12 w-12 rounded-full shadow-lg" aria-label="Tambah transaksi">
          <Plus className="h-5 w-5" />
        </Button>
      </TransactionModal>
    </div>
  );
}
