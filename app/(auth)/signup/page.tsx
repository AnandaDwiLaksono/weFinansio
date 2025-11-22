"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FormSchema = z.object({
  name: z.string().min(2, "Minimal 2 karakter").max(80),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Minimal 8 karakter").max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  path: ["confirm"],
  message: "Konfirmasi kata sandi tidak sama",
});

type FormValues = z.infer<typeof FormSchema>;

export default function SignUpPage() {
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    mode: "onChange"
  });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v.name, email: v.email, password: v.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Gagal mendaftar");

        return;
      }
      
      toast.success("Akun berhasil dibuat");

      window.location.href = "/api/auth/signin";
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="w-full flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <Image src="/icons/wefinansio_logo_bluegrad_full.png" alt="weFinansio" width={80} height={80} className="mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">
                Mulai perjalanan finansialmu 🚀
              </p>
              <h1 className="mt-3 text-2xl font-semibold">Daftar</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label className="mb-2">Nama</Label>
                <Input placeholder="Nama lengkap" {...register("name")} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label className="mb-2">Email</Label>
                <Input type="email" placeholder="nama@email.com" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <Label className="mb-2">Kata sandi</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Minimal 8 karakter" {...register("password")} className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <Label className="mb-2">Konfirmasi kata sandi</Label>
                <div className="relative">
                  <Input type={showConfirm ? "text" : "password"} placeholder="Ulangi kata sandi" {...register("confirm")} className="pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
              </div>

              <Button type="submit" className="w-full cursor-pointer" disabled={submitting}>
                {submitting ? "Mendaftar..." : "Daftar"}
              </Button>
            </form>
  
            {/* Divider with text 'OR' */}
            <div className="my-4 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-3 text-sm text-muted-foreground">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>
  
            <div className="mt-3">
              <Button variant="outline" className="w-full gap-2 cursor-pointer"
                onClick={() => signIn("google", { callbackUrl: "/", prompt: "select_account" })}>
                <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} className="h-5 w-5" />
                Daftar dengan Google
              </Button>
            </div>

            <p className="mt-4 text-center text-sm">
              Sudah punya akun?{" "}
              <Link href="/api/auth/signin" className="text-blue-600 hover:underline">Masuk</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right: Tagline (desktop only) */}
      <div className="hidden lg:flex bg-gradient-to-b from-blue-600 to-blue-500 text-white py-10 px-20 justify-center items-center">
        <div className="m-auto max-w-md">
          <div className="text-sm font-medium mb-2 opacity-90">Kelola uang dengan lebih sadar</div>
          <h2 className="text-3xl font-semibold leading-tight mb-3">
            Sadar, rencanakan, konsisten dengan keuanganmu — bersama weFinansio.
          </h2>
          <div className="text-sm leading-relaxed mb-5 opacity-95">
            Catat pengeluaran &amp; pemasukan, susun budget bulanan, capai goal tabungan, dan pantau portofolio investasimu di satu tempat.
          </div>
          <ul className="space-y-2.5 text-sm">
            <li>• Kategorikan transaksi otomatis berdasarkan keyword & akun.</li>
            <li>• Pantau budget, sisa limit per kategori, dan tren bulanan.</li>
            <li>• Set goal tabungan dengan target waktu, progress, dan pengingat.</li>
            <li>• Ringkas portofolio investasi: cash, reksa dana, saham, dan lainnya.</li>
          </ul>
          <div className="mt-6 px-4 py-3.5 rounded-xl bg-[rgba(255,255,255,0.08)] flex items-center justify-center gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <p className="font-medium">Snapshot keuangan hari ini</p>
              <p className="opacity-85">Lihat saldo, budget terpakai, dan progress goal secara sekilas.</p>
            </div>
            <div className="w-[72px] h-12 rounded-md bg-[rgba(255,255,255,0.12)] flex items-end justify-center gap-1 p-1.5">
              <div className="h-4 w-1.5 rounded-b-full bg-green-500"></div>
              <div className="h-6.5 w-1.5 rounded-b-full bg-green-500"></div>
              <div className="h-5 w-1.5 rounded-b-full bg-green-500"></div>
              <div className="h-8.5 w-1.5 rounded-b-full bg-green-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
