"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartLine, Eye, EyeOff, Receipt, Target } from "lucide-react";

const Schema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Minimal 8 karakter"),
});

type FormValues = z.infer<typeof Schema>;

export default function SignInPage() {
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    mode: "onChange"
  });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);

    const res = await signIn("credentials", {
      redirect: false,
      email: v.email,
      password: v.password,
      callbackUrl: "/",
    });

    setSubmitting(false);

    if (res?.error) {
      toast.error("Email atau kata sandi salah");

      return;
    }

    toast.success("Berhasil masuk");

    window.location.href = res?.url || "/";
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="w-full flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <Image src="/icons/wefinansio_logo_bluegrad_full.png" alt="weFinansio" width={80} height={80} className="mx-auto" />
              <p className="mt-3 text-sm text-muted-foreground">Akses dashboard keuanganmu</p>
              <h1 className="mt-3 text-2xl font-semibold">Masuk</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label className="mb-2">Email</Label>
                <Input type="email" placeholder="nama@email.com" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="mb-2">Kata sandi</Label>
                  <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">Lupa kata sandi?</Link>
                </div>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="********" {...register("password")} className="pr-10" />
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
              
              <Button type="submit" className="w-full cursor-pointer" disabled={submitting}>
                {submitting ? "Memproses..." : "Masuk"}
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
                onClick={() => signIn("google", { callbackUrl: "/" })}>
                <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} className="h-5 w-5" />
                Masuk dengan Google
              </Button>
            </div>

            <p className="mt-4 text-center text-sm">
              Belum punya akun?{" "}
              <Link className="text-blue-600 hover:underline" href="/signup">Daftar</Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right: Promo */}
      <div className="hidden lg:flex bg-gradient-to-b from-blue-600 to-blue-500 text-white py-10 px-14 justify-start items-center">
        <div className="m-auto max-w-lg">
          <h2 className="text-2xl font-bold leading-snug mb-2">
            Kelola keuangan pribadimu dengan lebih mudah.
          </h2>
          <p className="mb-6 opacity-96">
            Pantau pemasukan, pengeluaran, budgeting, goals, dan portofolio investasimu dalam satu dashboard yang rapi dan mudah dipahami.
          </p>
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2.5">
              <div className="flex-1 mt-6 px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.08)] flex justify-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[rgba(255,255,255,0.16)] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Input Transaksi</p>
                  <p className="text-xs mt-0.5 opacity-92">
                    Catat pemasukan dan pengeluaran harian dalam hitungan detik.
                  </p>
                </div>
              </div>
              <div className="flex-1 mt-6 px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.08)] flex justify-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-[rgba(255,255,255,0.16)] flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Set budget & goals</p>
                  <p className="text-xs mt-0.5 opacity-92">
                    Buat anggaran bulanan dan target keuangan yang jelas.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 mt-6 px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.08)] flex justify-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-[rgba(255,255,255,0.16)] flex items-center justify-center">
                <ChartLine className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Pantau portofolio</p>
                <p className="text-xs mt-0.5 opacity-92">
                  Lihat performa tabungan, reksa dana, dan investasi lainnya.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
