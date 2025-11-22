"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";

const Schema = z.object({
  email: z.email("Email tidak valid"),
});

type FormValues = z.infer<typeof Schema>;

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    mode: "onChange"
  });

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v.email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Gagal mengirim email reset password");
        return;
      }

      toast.success("Email reset password telah dikirim!");
      setEmailSent(true);
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
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
              <h1 className="mt-3 text-2xl font-semibold">Lupa Kata Sandi?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {emailSent 
                  ? "Kami telah mengirimkan link reset password ke email Anda"
                  : "Masukkan email Anda dan kami akan mengirimkan link untuk reset password"}
              </p>
            </div>

            {!emailSent ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label className="mb-2">Email</Label>
                  <div className="relative">
                    <Input 
                      type="email" 
                      placeholder="nama@email.com" 
                      {...register("email")} 
                      className="pl-10"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <Button type="submit" className="w-full cursor-pointer" disabled={submitting}>
                  {submitting ? "Mengirim..." : "Kirim Link Reset Password"}
                </Button>

                <Link href="/signin" className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline mt-4">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke halaman masuk
                </Link>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    Email telah dikirim ke <strong>{getValues("email")}</strong>
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Periksa inbox atau folder spam Anda. Link reset password akan kedaluwarsa dalam 1 jam.
                  </p>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full cursor-pointer"
                  onClick={() => setEmailSent(false)}
                >
                  Kirim Ulang
                </Button>

                <Link href="/signin" className="flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline mt-4">
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke halaman masuk
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Info */}
      <div className="hidden lg:flex bg-gradient-to-b from-blue-600 to-blue-500 text-white py-10 px-14 justify-start items-center">
        <div className="m-auto max-w-lg">
          <h2 className="text-2xl font-bold leading-snug mb-2">
            Butuh bantuan mengakses akun?
          </h2>
          <p className="mb-6 opacity-96">
            Kami akan mengirimkan link reset password ke email Anda. Pastikan email yang Anda masukkan adalah email yang terdaftar.
          </p>
          
          <div className="space-y-3">
            <div className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)]">
              <p className="text-sm font-semibold mb-1">📧 Periksa Email Anda</p>
              <p className="text-xs opacity-92">
                Link reset password akan dikirim ke inbox Anda dalam beberapa menit.
              </p>
            </div>
            
            <div className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)]">
              <p className="text-sm font-semibold mb-1">⏰ Link Berlaku 1 Jam</p>
              <p className="text-xs opacity-92">
                Pastikan Anda segera menggunakan link tersebut sebelum kedaluwarsa.
              </p>
            </div>
            
            <div className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)]">
              <p className="text-sm font-semibold mb-1">🔒 Aman & Terenkripsi</p>
              <p className="text-xs opacity-92">
                Password baru Anda akan dienkripsi dengan teknologi keamanan terkini.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
