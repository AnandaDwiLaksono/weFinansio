"use client";

import { useMemo, useState } from "react";
import { useApiMutation, useApiQuery, api } from "@/lib/react-query";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, Search, Wallet, Utensils, ShoppingCart, Home, Car, Coffee, Heart, Gift, DollarSign, TrendingUp, Briefcase } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import CategoryModal from "@/components/CategoryModal";
import ConfirmationModal from "@/components/ConfirmationModal";

// Icon mapper
const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  Wallet,
  Utensils,
  ShoppingCart,
  Home,
  Car,
  Coffee,
  Heart,
  Gift,
  DollarSign,
  TrendingUp,
  Briefcase,
};

type Row = {
  id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
  icon: string;
  archived: boolean;
  note: string;
  createdAt: string
};
type ListRes = {
  items: Row[];
  page: number;
  limit: number;
  total: number
};

export default function CategoriesContent() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | "income" | "expense">("all");
  const [page, setPage] = useState(1);
  const [archived, setArchived] = useState<"all" | "true" | "false">("all");

  const limit = 20;
  
  const { data } = useApiQuery<ListRes>(
    ["categories", { search, kind, archived, page, limit }],
    () => api.get("/api/categories?" + new URLSearchParams({
      search: search,
      kind,
      archived,
      page:String(page),
      limit:String(limit)
    })),
    { placeholderData: keepPreviousData }
  );

  const delMut = useApiMutation<{ok:true},{id:string}>(
    ({ id }) => api.del(`/api/categories/${id}`),
    {
      onSuccess: () => {
        toast.success("Kategori dihapus");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      }
    }
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / limit));
  const activedCategories = useMemo(() => items.filter(c => !c.archived).length, [items]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold mb-4 text-foreground w-fit">
            Kelola kategori pemasukan & pengeluaran
          </h1>
          <Card className="px-4 py-2.5 bg-secondary rounded-xl flex flex-col gap-1 shadow-lg">
            <div className="text-xs font-medium text-muted-foreground tracking-wider">
              TOTAL KATEGORI
            </div>
            <div className="text-lg font-semibold text-foreground">
              {total} kategori
            </div>
          </Card>
        </div>
        <div className="hidden md:block">
          <CategoryModal asChild type="add">
            <Button size="sm" className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" /> Tambah Kategori
            </Button>
          </CategoryModal>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 gap-3 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xs font-medium flex justify-between items-center">
            Filter kategori
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                setSearch("");
                setKind("all");
                setArchived("all");
              }}
            >
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Pencarian
              </label>
              <div className="relative">
                <Input
                  placeholder="Cari nama kategori..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pr-8"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Tipe
              </label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as "all" | "income" | "expense");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="income">Pemasukan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Status
              </label>
              <Select
                value={archived}
                onValueChange={(v) => {
                  setArchived(v as "all" | "true" | "false");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="false">Aktif</SelectItem>
                  <SelectItem value="true">Diarsipkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop table */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-10 gap-3">  
        <Card className="lg:col-span-7 shadow-lg p-4 gap-2.5">
          <CardHeader className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold">
                Daftar Kategori
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Kelola semua kategori pemasukan dan pengeluaran.
              </p>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-accent text-xs text-muted-foreground">
              {activedCategories} kategori aktif
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No.</TableHead>
                  <TableHead>Nama Kategori</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c, index) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {String(index + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.name}
                    </TableCell>
                    <TableCell className="capitalize">
                      <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.kind === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {c.kind === "income" ? "Pemasukan" : "Pengeluaran"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4.5 w-4.5 rounded-full m-auto" style={{ background: c.color }} />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const IconComponent = getIconComponent(c.icon);
                        return <IconComponent className="h-5 w-5 m-auto" />;
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span className={`h-2 w-2 rounded-full ${c.archived ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        {c.archived ? 'Diarsipkan' : 'Aktif'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.note ? c.note : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-center gap-1.5 items-center">
                        <CategoryModal
                          type="edit"
                          id={c.id}
                          initial={{
                            name: c.name,
                            kind: c.kind,
                            color: c.color,
                            icon: c.icon,
                            archived: c.archived,
                            note: c.note,
                          }}
                        >
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </CategoryModal>
                        <ConfirmationModal
                          title="Hapus Kategori"
                          description={`Apakah Anda yakin ingin menghapus kategori "${c.name}"? Tindakan ini tidak dapat dibatalkan.`}
                          confirmText="Hapus"
                          cancelText="Batal"
                          onConfirm={() => delMut.mutate({ id: c.id })}
                          trigger={
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7 text-white rounded-full"
                              aria-label="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length===0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="p-6 text-sm text-muted-foreground text-center"
                    >
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-1.5 border-t flex items-center justify-between text-xs text-muted-foreground">
              <div>Menampilkan {(page - 1) * limit + 1} - {Math.min(page * limit, total)} dari {total} kategori</div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Ringkasan Akun - Sidebar Kanan */}
        <Card className="lg:col-span-3 hidden md:flex shadow-lg p-4 gap-3">
          <CardHeader className="gap-3">
            <CardTitle className="text-base font-semibold">
              Ringkasan Kategori
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Lihat distribusi saldo berdasarkan tipe.
            </p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(() => {
              const byType = items
                .filter(c => !c.archived)
                .reduce((acc, curr) => {
                  acc[curr.kind] = (acc[curr.kind] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
              
              const types = [
                { key: "income", label: "Pemasukan" },
                { key: "expense", label: "Pengeluaran" },
              ];

              return types.map(({ key, label }) => {
                const percentage = activedCategories === 0 ? 0 : ((byType[key] || 0) / activedCategories) * 100;
                
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          key === 'income' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium">
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                           · {byType[key] || 0} kategori
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {percentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          key === 'income' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              });
            })()}
            
            <Separator className="my-3" />
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Kategori digunakan untuk mengelompokkan transaksi dan laporanmu. Pastikan setiap transaksi memiliki kategori yang tepat agar analisis keuangan lebih akurat.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2 bg-card rounded-lg p-2.5 shadow-lg">
        <div className="flex justify-between items-center gap-2">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">
              Daftar Kategori
            </h2>
            <p className="text-xs text-muted-foreground">
              Kelola semua kategori pemasukan dan pengeluaran.
            </p>
          </div>
          <div className="px-1.5 py-0.5 rounded-full bg-accent text-xs text-muted-foreground w-1/4">
            {activedCategories} kategori aktif
          </div>
        </div>
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Tidak ada data.
          </div>
        )}
        {items.map((c, idx) => {
          const IconComponent = getIconComponent(c.icon);
          return (
            <Card key={c.id} className="bg-secondary p-2">
              <CardContent className="p-2 gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-mono text-muted-foreground">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground mb-1">
                        {c.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.kind === "income" ? "Pemasukan" : "Pengeluaran"}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground flex items-center justify-center gap-2 mb-1">
                        <div className="h-4 w-4 rounded-full" style={{ background: c.color }} />
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs mt-1 bg-[#10b9811f] px-2 py-0.5 rounded-full text-[#047857] font-medium">
                        <span className={`h-2 w-2 rounded-full ${c.archived ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        {c.archived ? 'Diarsipkan' : 'Aktif'}
                      </span>
                    </div>
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    {c.note ? c.note : '-'}
                  </div>
                  <div className="flex gap-2">
                    <CategoryModal
                      type="edit"
                      id={c.id}
                      initial={{
                        name: c.name,
                        kind: c.kind,
                        color: c.color,
                        icon: c.icon,
                        archived: c.archived,
                        note: c.note || ""
                    }}>
                      <Button variant="default" size="sm" className="h-8 w-8 p-0 rounded-full">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </CategoryModal>
                    <ConfirmationModal
                      title="Hapus Kategori"
                      description={`Apakah Anda yakin ingin menghapus kategori "${c.name}"? Tindakan ini tidak dapat dibatalkan.`}
                      confirmText="Hapus"
                      cancelText="Batal"
                      onConfirm={() => delMut.mutate({ id: c.id })}
                      trigger={
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-7 w-7 text-white rounded-full"
                          aria-label="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Pagination mobile */}
        <div className="md:hidden flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Total {total} kategori
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>
      
      {/* Ringkasan Mobile */}
      <Card className="md:hidden shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Ringkasan Kategori
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            const byType = items
              .filter(c => !c.archived)
              .reduce((acc, curr) => {
                acc[curr.kind] = (acc[curr.kind] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
            
            const types = [
              { key: "income", label: "Pemasukan" },
              { key: "expense", label: "Pengeluaran" },
            ];

            return types.map(({ key, label }) => {
                const percentage = activedCategories === 0 ? 0 : ((byType[key] || 0) / activedCategories) * 100;
              
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        key === 'income' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        · {byType[key] || 0} kategori
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      {percentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        key === 'income' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            });
          })()}
        </CardContent>
      </Card>

      {/* FAB tambah (mobile) */}
      <div className="md:hidden fixed bottom-16 right-4 z-40">
        <CategoryModal asChild type="add">
          <Button
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Tambah kategori"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </CategoryModal>
      </div>
    </div>
  );
}

const getIconComponent = (iconName: string) => {
  return iconMap[iconName] || Wallet; // Default to Wallet if not found
};
