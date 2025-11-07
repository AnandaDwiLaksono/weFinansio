"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddTransactionModal from "@/components/AddTransactionModal";

export default function FabAdd() {
  // You'll need to provide actual accounts, categories, and userId data
  const accounts = [{ id: "1", name: "Cash" }]; // Replace with actual accounts data
  const categories = [{ id: "1", name: "Food" }]; // Replace with actual categories data
  const userId = ""; // Replace with actual user ID

  return (
    <div className="md:hidden fixed bottom-16 right-4 z-40">
      <AddTransactionModal accounts={accounts} categories={categories} userId={userId} />
      <Button className="h-12 w-12 rounded-full shadow-lg" aria-label="Tambah transaksi">
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
}
