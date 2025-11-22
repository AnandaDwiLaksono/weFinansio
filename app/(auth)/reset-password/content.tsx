"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

const Schema = z.object({
  password: z.string().min(8, "Minimal 8 karakter").max(128),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  path: ["confirmPassword"],
  message: "Konfirmasi password tidak sama",
});

type FormValues = z.infer<typeof Schema>;

export default function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    const emailParam = searchParams.get("email");
    
    if (!tokenParam || !emailParam) {
      toast.error("Link reset password tidak valid");
      router.push("/forgot-password");
    }
    
    setToken(tokenParam);
    setEmail(emailParam);
  }, [searchParams, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    mode: "onChange"
  });

  const onSubmit = async (v: FormValues) => {
    if (!token || !email) {
      toast.error("Link reset password tidak valid");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token, 
          email, 
          password: v.password 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Gagal reset password");
        return;
      }

      toast.success("Password berhasil direset!");
      setSuccess(true);
      
      // Redirect ke signin setelah 3 detik
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || !email) {
    return null; // atau loading state
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="w-full flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <Image src="/icons/wefinansio_logo_bluegrad_full.png" alt="weFinansio" width={80} height={80} className="mx-auto" />
              <h1 className="mt-3 text-2xl font-semibold">Reset Kata Sandi</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {success 
                  ? "Password Anda telah berhasil direset"
                  : "Masukkan password baru untuk akun Anda"}
              </p>
            </div>

            {!success ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800">
                    Reset password untuk: <strong>{email}</strong>
                  </p>
                </div>

                <div>
                  <Label className="mb-2">Password Baru</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Minimal 8 karakter" 
                      {...register("password")} 
                      className="pr-10"
                    />
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
                  <Label className="mb-2">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Input 
                      type={showConfirm ? "text" : "password"} 
                      placeholder="Ulangi password baru" 
                      {...register("confirmPassword")} 
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <Button type="submit" className="w-full cursor-pointer" disabled={submitting}>
                  {submitting ? "Memproses..." : "Reset Password"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Password berhasil direset!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Anda akan diarahkan ke halaman login...
                    </p>
                  </div>
                </div>

                <Link href="/signin">
                  <Button className="w-full cursor-pointer">
                    Lanjut ke Halaman Login
                  </Button>
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
            Keamanan Akun Anda
          </h2>
          <p className="mb-6 opacity-96">
            Password baru Anda akan dienkripsi dengan teknologi keamanan terkini untuk melindungi data keuangan Anda.
          </p>
          
          <div className="space-y-3">
            <div className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)]">
              <p className="text-sm font-semibold mb-1">🔐 Tips Password Aman</p>
              <ul className="text-xs opacity-92 space-y-1 ml-4 list-disc">
                <li>Gunakan minimal 8 karakter</li>
                <li>Kombinasi huruf besar, kecil, angka, dan simbol</li>
                <li>Hindari menggunakan info pribadi</li>
                <li>Jangan gunakan password yang sama di berbagai akun</li>
              </ul>
            </div>
            
            <div className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)]">
              <p className="text-sm font-semibold mb-1">✅ Akses Langsung</p>
              <p className="text-xs opacity-92">
                Setelah reset password berhasil, Anda dapat langsung login dengan password baru.
              </p>
            </div>
            
            <div className="px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)]">
              <p className="text-sm font-semibold mb-1">🛡️ Data Anda Aman</p>
              <p className="text-xs opacity-92">
                Kami menggunakan enkripsi end-to-end untuk melindungi semua informasi finansial Anda.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
