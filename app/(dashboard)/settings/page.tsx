"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

import { useApiQuery, useApiMutation, api } from "@/lib/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type SettingsReq = {
  baseCurrency: string;
  startDatePeriod: string;
  themeMode: "light" | "dark";
  offlineMode: "minimal" | "full";
};

type SettingsRes = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  settings: {
    baseCurrency: string;
    startDatePeriod: string;
    themeMode: "light" | "dark";
    offlineMode: "minimal" | "full";
  };
};

const periodStartDays = Array.from({ length: 28 }, (_, i) => (i + 1).toString());

export default function SettingsPage() {
  const { data, refetch } = useApiQuery<SettingsRes>(
    ["settings"],
    () => api.get("/api/settings"),
    { staleTime: 60000 }
  );

  const save = useApiMutation<{ ok: true }, SettingsReq>(
    (payload) => api.put("/api/settings", payload),
    {
      toastSuccess: "Pengaturan disimpan",
      onSuccess: (_res, vars: SettingsReq) => {
        toast.success("Pengaturan disimpan");
        refetch();
        // sinkron ke localStorage & SW
        try {
          const mode = vars.offlineMode;
          if (mode) {
            window.localStorage.setItem("wefinansio_offline_mode", mode);
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: "OFFLINE_MODE",
                value: mode,
              });
            }
          }
        } catch {
          // abaikan error kecil
        }
      },
    }
  );

  const [baseCurrency, setBaseCurrency] = useState<string>(
    data?.settings?.baseCurrency ?? "IDR"
  );
  const [offlineMode, setOfflineMode] = useState<"minimal" | "full">(
    data?.settings?.offlineMode ?? "minimal"
  );
  const [periodStartDay, setPeriodStartDay] = useState<string>(
    data?.settings?.startDatePeriod ?? "1"
  );
  const [appearanceMode, setAppearanceMode] = useState<"light" | "dark">(
    data?.settings?.themeMode ? data.settings.themeMode : "light"
  );
  const [applyAppearanceAll, setApplyAppearanceAll] = useState<boolean>(true);

  const handleReset = () => {
    setBaseCurrency("IDR");
    setPeriodStartDay("1");
    setAppearanceMode("light");
    setApplyAppearanceAll(true);

    window.localStorage.removeItem("wefinansio_theme_mode");
  };

  const handleSave = () => {
    window.localStorage.setItem("wefinansio_theme_mode", appearanceMode);
    
    // Apply theme immediately
    if (appearanceMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    save.mutate({
      baseCurrency,
      startDatePeriod: periodStartDay,
      themeMode: appearanceMode,
      offlineMode,
    });
  };

  useEffect(() => {
    if (!data) return;
    setBaseCurrency(data.settings.baseCurrency);
    setPeriodStartDay(data.settings.startDatePeriod);
    setOfflineMode(data.settings.offlineMode);
    // set initial appearance from settings or localStorage safely on client
    const localTheme =
      typeof window !== "undefined"
        ? window.localStorage.getItem("wefinansio_theme_mode")
        : null;

    const initial =
      data?.settings?.themeMode
        ? data.settings.themeMode
        : localTheme
          ? "dark"
          : "light";

    setAppearanceMode(initial);
  }, [data]);

  // dalam komponen SettingsPage
  useEffect(() => {
    if (data?.settings?.offlineMode) {
      try {
        window.localStorage.setItem(
          "wefinansio_offline_mode",
          data.settings.offlineMode
        );
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "OFFLINE_MODE",
            value: data.settings.offlineMode,
          });
        }
      } catch {}
    }
  }, [data?.settings?.offlineMode]);

  if (!data) {
    return (
      <div className="text-sm text-muted-foreground">Memuat pengaturan…</div>
    );
  }

  const { user } = data;

  return (
    <div className="space-y-4">
      {/* Subtitle */}
      <h1 className="text-xl font-medium mb-4 text-foreground">
        Atur preferensi keuangan dan tampilan sesuai kebutuhanmu.
      </h1>

      {/* Profile */}
      <Card className="shadow-lg gap-4 py-5 px-6">
        <CardHeader className="gap-0.5 pb-2">
          <CardTitle className="text-base">Profil</CardTitle>
          <CardDescription className="text-sm">
            Data profil mengikuti akun login (Google / email).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name ?? ""} />
            )}
            <AvatarFallback className="bg-secondary text-lg font-medium text-secondary-foreground">
              {(user.name ?? user.email ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <div className="font-medium text-sm">
              {user.name ?? "Tanpa nama"}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.email}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Perubahan profil bisa dilakukan melalui penyedia akun login-mu.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User settings */}
      <Card className="shadow-lg gap-4 py-5 px-6">
        <CardHeader className="pb-2 gap-0.5">
          <CardTitle className="text-base">
            Preferensi Keuangan
          </CardTitle>
          <CardDescription className="text-sm">
            Sesuaikan mata uang, periode akuntansi, dan mode tampilan aplikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-8 flex-wrap">
          {/* Finance preferences */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Base currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Base currency</label>
              <Select
                value={baseCurrency}
                onValueChange={(v: string) => setBaseCurrency(v)}
              >
                <SelectTrigger className="w-full">
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

            {/* Start date of the accounting period */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Tanggal awal periode akuntansi
              </label>
              <Select
                value={periodStartDay}
                onValueChange={(v: string) => setPeriodStartDay(v)}
              >
                <SelectTrigger className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Setiap tanggal</span>
                    <SelectValue
                      placeholder="Pilih tanggal"
                      className="text-sm font-semibold"
                    />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {periodStartDays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day.padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Semua laporan dan budget akan mengikuti tanggal mulai ini.
              </p>
            </div>
          </div>

          {/* Theme preferences */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="space-y-2">
              {/* Theme mode selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Mode tampilan
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={appearanceMode === "light" ? "default" : "outline"}
                    onClick={() => setAppearanceMode("light")}
                  >
                    Terang
                  </Button>
                  <Button
                    variant={appearanceMode === "dark" ? "default" : "outline"}
                    onClick={() => setAppearanceMode("dark")}
                  >
                    Gelap
                  </Button>
                </div>
              </div>

              {/* Mode preview */}
              <div className="rounded-lg border flex items-center justify-between px-3 py-2.5 gap-4 bg-secondary text-xs">
                <div>
                  <div className="font-medium">
                    Pratinjau mode {appearanceMode === "dark" ? "gelap" : "terang"}
                  </div>
                  <p className="text-muted-foreground">
                    Kontras {appearanceMode === "dark" ? "rendah dengan latar gelap, nyaman di malam hari" : "tinggi dengan latar belakang cerah, cocok untuk di siang hari"}.
                  </p>
                </div>
                <div
                  style={{
                    width: "120px",
                    height: "60px",
                    borderRadius: "var(--radius, 6px)",
                    background:
                      appearanceMode === "dark"
                        ? "hsl(var(--card-dark, 217 33% 17%))"
                        : "var(--card)",
                    display: "flex",
                    flexDirection: "column",
                    padding: "6px 8px",
                    gap: "4px",
                    border: `1px solid ${appearanceMode === "dark" ? "hsl(var(--border-dark, 217 33% 25%))" : "var(--border)"}`,
                    boxShadow: appearanceMode === "dark"
                      ? "0 1px 2px rgba(0,0,0,0.3)"
                      : "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "60%",
                      height: "10px",
                      borderRadius: "999px",
                      background:
                        appearanceMode === "dark"
                          ? "hsl(var(--muted-dark, 217 33% 35%))"
                          : "var(--muted)",
                    }}
                  />
                  <div
                    style={{
                      width: "40%",
                      height: "8px",
                      borderRadius: "999px",
                      background:
                        appearanceMode === "dark"
                          ? "hsl(var(--muted-dark, 217 33% 35%))"
                          : "var(--muted)",
                    }}
                  />
                  <div
                    style={{
                      width: "80%",
                      height: "10px",
                      borderRadius: "999px",
                      background:
                        appearanceMode === "dark"
                          ? "hsl(var(--muted-dark, 217 33% 35%))"
                          : "var(--muted)",
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Preferensi lainnya
              </label>
              <div className="flex items-start gap-2 mt-1">
                <Checkbox
                  id="appearance-apply-all"
                  checked={applyAppearanceAll}
                  onCheckedChange={(v) => setApplyAppearanceAll(v === true)}
                />
                <label
                  htmlFor="appearance-apply-all"
                  className="text-xs text-muted-foreground"
                >
                  Terapkan mode tampilan ini ke semua perangkat yang terhubung.
                </label>
              </div>
            </div>
          </div>
        </CardContent>

        <CardContent className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleSave}>
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
