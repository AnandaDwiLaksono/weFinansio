"use client";

import { useState, useEffect } from "react";
import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

type SettingsReq = {
  baseCurrency: string;
  offlineMode: "minimal" | "full";
  defaultIncomeCategoryId: string | null;
  defaultExpenseCategoryId: string | null;
};

type SettingsRes = {
  user: { id:string; name:string|null; email:string|null; image:string|null };
  settings: {
    baseCurrency:string;
    defaultIncomeCategoryId:string|null;
    defaultIncomeCategoryName:string|null;
    defaultExpenseCategoryId:string|null;
    defaultExpenseCategoryName:string|null;
    offlineMode:"minimal"|"full";
  };
};

export default function SettingsPage(){
  const { data, refetch } = useApiQuery<SettingsRes>(
    ["settings"], () => api.get("/api/settings"), { staleTime: 60000 }
  );

  const save = useApiMutation<{ok:true}, SettingsReq>(
    (payload)=> api.put("/api/settings", payload),
    { toastSuccess:"Pengaturan disimpan", onSuccess: ()=> refetch() }
  );

  const { data: cats } = useApiQuery<{items:{id:string; name:string; kind:"income"|"expense"}[]}>(
    ["settings-cats"], () => api.get("/api/categories?limit=200&page=1"), { staleTime: 60000 }
  );

  const [baseCurrency, setBaseCurrency] = useState<string>(data?.settings?.baseCurrency ?? "IDR");
  const [offlineMode, setOfflineMode] = useState<"minimal"|"full">((data?.settings?.offlineMode ?? "minimal") as "minimal"|"full");
  const [incomeCat, setIncomeCat] = useState<string>(data?.settings?.defaultIncomeCategoryId ?? "");
  const [expenseCat, setExpenseCat] = useState<string>(data?.settings?.defaultExpenseCategoryId ?? "");

  useEffect(() => {
    if (!data) return;
    setBaseCurrency(data.settings.baseCurrency);
    setOfflineMode(data.settings.offlineMode);
    setIncomeCat(data.settings.defaultIncomeCategoryId ?? "");
    setExpenseCat(data.settings.defaultExpenseCategoryId ?? "");
  }, [data]);

  if (!data) {
    return <div className="text-sm text-muted-foreground">Memuat pengaturan…</div>;
  }

  const { user, settings } = data;

  function handleSave() {
    save.mutate({
      baseCurrency,
      offlineMode,
      defaultIncomeCategoryId: incomeCat || null,
      defaultExpenseCategoryId: expenseCat || null,
    });
  }

  const incomeCats = (cats?.items ?? []).filter(c => c.kind === "income");
  const expenseCats = (cats?.items ?? []).filter(c => c.kind === "expense");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Atur preferensi weFinansio sesuai kebutuhanmu.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
            <AvatarFallback>{(user.name ?? user.email ?? "?").slice(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name ?? "Tanpa nama"}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Data profil mengikuti akun login (Google / email). Perubahan profil bisa dilakukan via provider.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Finance settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Preferensi Keuangan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium">Base currency</label>
            <Select value={baseCurrency} onValueChange={(v: string) => setBaseCurrency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Dipakai sebagai mata uang utama laporan & portfolio.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Mode offline</label>
            <Select value={offlineMode} onValueChange={(v: "minimal" | "full") => setOfflineMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full (cache + antrean transaksi)</SelectItem>
                <SelectItem value="minimal">Minimal (hanya cache dasar)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Mengontrol seberapa agresif PWA menyimpan data & antrean saat offline.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Kategori default pemasukan</label>
            <Select value={incomeCat} onValueChange={(v: string) => setIncomeCat(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-set">(Tidak diset)</SelectItem>
                {incomeCats.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Dipakai saat impor / transaksi cepat tanpa kategori pemasukan.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Kategori default pengeluaran</label>
            <Select value={expenseCat} onValueChange={(v: string) => setExpenseCat(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-set">(Tidak diset)</SelectItem>
                {expenseCats.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Dipakai saat impor / transaksi cepat tanpa kategori pengeluaran.
            </p>
          </div>
        </CardContent>

        <CardContent className="border-t mt-4 pt-4 flex justify-end">
          <Button onClick={handleSave} disabled={save.isPending}>Simpan Pengaturan</Button>
        </CardContent>
      </Card>
    </div>
  );
}
