"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Bath,
  Bike,
  Building,
  Bus,
  Calendar,
  Car,
  Cigarette,
  Cloud,
  Coffee,
  Cookie,
  Film,
  FileText,
  Gamepad2,
  Gift,
  HandHeart,
  Heart,
  HeartHandshake,
  HeartPulse,
  IceCream,
  Landmark,
  Laptop,
  Lightbulb,
  LineChart,
  Music,
  Package,
  PiggyBank,
  Pizza,
  Receipt,
  RefreshCcw,
  Repeat,
  Scissors,
  ScrollText,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Signal,
  Smartphone,
  Soup,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Train,
  UserRound,
  UsersRound,
  Utensils,
  Wallet,
  Wifi,
  User,
  Users,
  CalendarClock,
  Tablet,
  House,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useApiMutation, api } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Row = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  archived: boolean;
  // usage: number;
  createdAt: string;
};
type ListRes = {
  items: Row[];
  page: number;
  limit: number;
  total: number;
};

const listIcons = [
  // Food
  { label: "Utensils", value: "Utensils", icon: Utensils },
  { label: "Soup", value: "Soup", icon: Soup },
  { label: "Pizza", value: "Pizza", icon: Pizza },
  
  // Smoking
  { label: "Cigarette", value: "Cigarette", icon: Cigarette },
  { label: "Cloud", value: "Cloud", icon: Cloud },
  
  // Transport
  { label: "Car", value: "Car", icon: Car },
  { label: "Bus", value: "Bus", icon: Bus },
  { label: "Bike", value: "Bike", icon: Bike },
  { label: "Train", value: "Train", icon: Train },
  
  // People
  { label: "Heart", value: "Heart", icon: Heart },
  { label: "User", value: "User", icon: User },
  { label: "Users", value: "Users", icon: Users },
  { label: "User Round", value: "UserRound", icon: UserRound },
  { label: "Users Round", value: "UsersRound", icon: UsersRound },
  
  // Subscription
  { label: "Repeat", value: "Repeat", icon: Repeat },
  { label: "Refresh CCW", value: "RefreshCcw", icon: RefreshCcw },
  { label: "Calendar", value: "Calendar", icon: Calendar },
  { label: "Calendar Clock", value: "CalendarClock", icon: CalendarClock },
  
  // Self Care
  { label: "Sparkles", value: "Sparkles", icon: Sparkles },
  { label: "Bath", value: "Bath", icon: Bath },
  { label: "Scissors", value: "Scissors", icon: Scissors },
  
  // Mobile
  { label: "Smartphone", value: "Smartphone", icon: Smartphone },
  { label: "Signal", value: "Signal", icon: Signal },
  { label: "Wifi", value: "Wifi", icon: Wifi },
  
  // Snacks
  { label: "Ice Cream", value: "IceCream", icon: IceCream },
  { label: "Cookie", value: "Cookie", icon: Cookie },
  { label: "Coffee", value: "Coffee", icon: Coffee },
  
  // Admin
  { label: "File Text", value: "FileText", icon: FileText },
  { label: "Receipt", value: "Receipt", icon: Receipt },
  { label: "Scroll Text", value: "ScrollText", icon: ScrollText },
  
  // Housing
  { label: "House", value: "House", icon: House },
  { label: "Building", value: "Building", icon: Building },
  
  // Bills
  { label: "Lightbulb", value: "Lightbulb", icon: Lightbulb },
  
  // Salary
  { label: "Wallet", value: "Wallet", icon: Wallet },
  { label: "Banknote", value: "Banknote", icon: Banknote },
  { label: "Landmark", value: "Landmark", icon: Landmark },
  
  // Fashion
  { label: "Shirt", value: "Shirt", icon: Shirt },
  { label: "Shopping Bag", value: "ShoppingBag", icon: ShoppingBag },
  
  // Charity
  { label: "Hand Heart", value: "HandHeart", icon: HandHeart },
  { label: "Heart Handshake", value: "HeartHandshake", icon: HeartHandshake },
  
  // Debt
  { label: "Arrow Down Left", value: "ArrowDownLeft", icon: ArrowDownLeft },
  { label: "Trending Down", value: "TrendingDown", icon: TrendingDown },
  
  // Receivable
  { label: "Arrow Up Right", value: "ArrowUpRight", icon: ArrowUpRight },
  { label: "Trending Up", value: "TrendingUp", icon: TrendingUp },
  
  // Gift
  { label: "Gift", value: "Gift", icon: Gift },
  
  // Health
  { label: "Heart Pulse", value: "HeartPulse", icon: HeartPulse },
  { label: "Stethoscope", value: "Stethoscope", icon: Stethoscope },
  { label: "Activity", value: "Activity", icon: Activity },
  
  // Shopping
  { label: "Shopping Cart", value: "ShoppingCart", icon: ShoppingCart },
  { label: "Package", value: "Package", icon: Package },
  
  // Investment
  { label: "Line Chart", value: "LineChart", icon: LineChart },
  { label: "Piggy Bank", value: "PiggyBank", icon: PiggyBank },
  
  // Gadgets
  { label: "Laptop", value: "Laptop", icon: Laptop },
  { label: "Tablet", value: "Tablet", icon: Tablet },
  
  // Entertainment
  { label: "Gamepad", value: "Gamepad2", icon: Gamepad2 },
  { label: "Music", value: "Music", icon: Music },
  { label: "Film", value: "Film", icon: Film },
];
listIcons.sort((a, b) => a.label.localeCompare(b.label));

export default function CategoryModal({
  asChild = false,
  children,
  type = "add",
  id = "",
  initial = {
    name: "",
    kind: "expense",
    color: "#3b82f6",
    icon: "Wallet",
    archived: false,
    note: "",
  },
}: {
  asChild?: boolean;
  children?: React.ReactNode;
  type?: string | "add" | "edit";
  id?: string;
  initial?: {
    name: string;
    kind: "income" | "expense";
    color: string;
    icon: string;
    archived: boolean;
    note: string;
  };
}) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);

  const check = useApiMutation<
    ListRes,
    {
      kind: "income" | "expense";
    }
  >(
    () =>
      api.get(
        "/api/categories?" +
          new URLSearchParams({
            kind: form.kind,
            limit: "100",
            page: "1",
          }).toString()
      ),
    {
      onSuccess: (data) => {
        const exists = data.items.some(
          (c) => c.name.trim().toLowerCase() === form.name.trim().toLowerCase()
        );

        if (exists) {
          toast.error("Kategori dengan nama & tipe ini sudah ada.");
          return;
        }

        create.mutate({
          name: form.name,
          kind: form.kind as "income" | "expense",
          color: form.color,
          icon: form.icon,
          archived: form.archived,
          note: form.note,
        });
      },
    }
  );

  const create = useApiMutation<
    { id: string },
    {
      name: string;
      kind: "income" | "expense";
      color: string;
      icon: string;
      archived: boolean;
      note: string;
    }
  >((payload) => api.post("/api/categories", payload), {
    onSuccess: () => {
      toast.success("Kategori dibuat");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
    },
  });

  const patch = useApiMutation<
    { ok: true },
    {
      name: string;
      kind: "income" | "expense";
      color: string;
      icon: string;
      archived: boolean;
      note: string;
    }
  >((payload) => api.patch(`/api/categories/${id}`, payload), {
    onSuccess: () => {
      toast.success("Kategori diperbarui");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setForm(initial);
      }}
    >
      <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === "add" ? "Tambah" : "Edit"} Kategori
          </DialogTitle>
          <DialogDescription className="hidden sm:block">
            {type === "add"
              ? "Buat kategori baru untuk mengelompokkan transaksi Anda."
              : "Perbarui kategori Anda."}
          </DialogDescription>
        </DialogHeader>
        <h3 className="text-xs font-medium text-muted-foreground tracking-wider">
          DETAIL KATEGORI
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name) return toast.error("Nama wajib diisi");

            if (type === "edit") {
              patch.mutate({
                name: form.name,
                kind: form.kind as "income" | "expense",
                color: form.color,
                icon: form.icon,
                archived: form.archived,
                note: form.note,
              });
            } else {
              check.mutate({
                kind: form.kind as "income" | "expense",
              });
            }
          }}
          className="grid gap-3"
        >
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Nama Kategori <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Nama kategori"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Tipe <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.kind}
                disabled={type === "edit"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, kind: v as "income" | "expense" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={form.archived ? "true" : "false"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, archived: v === "true" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Aktif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Aktif</SelectItem>
                  <SelectItem value="true">Diarsipkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Warna
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-12 rounded border"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                />
                <Input
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="w-full space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Icon <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.icon}
                onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Icon" />
                </SelectTrigger>
                <SelectContent>
                  {listIcons.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <icon.icon /> {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-full space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Catatan
            </label>
            <Input
              placeholder="Tambahkan catatan (opsional)"
              value={form.note}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  note: e.target.value as unknown as string,
                }))
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={create.isPending || patch.isPending}
            >
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
