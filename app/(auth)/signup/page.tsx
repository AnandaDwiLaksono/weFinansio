"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { toast } from "sonner";
// import { cn } from "@/lib/utils";

const FormSchema = z.object({
  name: z.string().min(2, "Minimal 2 karakter").max(80),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Minimal 8 karakter").max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  path: ["confirm"],
  message: "Konfirmasi tidak sama",
});

type FormValues = z.infer<typeof FormSchema>;

export default function SignUpPage() {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(FormSchema), mode: "onChange" });

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
      // opsi: langsung arahkan ke signin
      toast.success("Akun berhasil dibuat");
      window.location.href = "/api/auth/signin";
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: Form */}
      <div className="w-full flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="mb-4 text-center">
              <Image src="/icons/wefinansio_logo_bluegrad_full.png" alt="weFinansio" width={80} height={80} className="mx-auto" />
              <h1 className="mt-3 text-2xl font-semibold">Daftar</h1>
              <p className="text-sm text-muted-foreground">
                Mulai perjalanan finansialmu 🚀
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <Label>Nama</Label>
                <Input placeholder="Nama lengkap" {...register("name")} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="nama@email.com" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <Label>Kata sandi</Label>
                <Input type="password" placeholder="Minimal 8 karakter" {...register("password")} />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <Label>Konfirmasi kata sandi</Label>
                <Input type="password" placeholder="Ulangi kata sandi" {...register("confirm")} />
                {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Mendaftar..." : "Daftar"}
              </Button>
            </form>

            <div className="mt-3">
              <Button variant="outline" className="w-full gap-2"
                onClick={() => signIn("google", { callbackUrl: "/" })}>
                <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} className="h-5 w-5" />
                Daftar dengan Google
              </Button>
            </div>

            <p className="mt-4 text-center text-sm">
              Sudah punya akun?{" "}
              <a className="text-primary hover:underline" href="/api/auth/signin">Masuk</a>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right: Tagline (desktop only) */}
      <div className="hidden md:flex bg-gradient-to-b from-blue-600 to-blue-500 text-white p-10">
        <div className="m-auto max-w-md">
          <h2 className="text-3xl font-bold leading-snug">
            Sadar, rencanakan, konsisten — bareng weFinansio.
          </h2>
          <p className="mt-4 opacity-90">
            Catat rapi, keputusan lebih pasti.
          </p>
          <ul className="mt-6 space-y-2 opacity-95 text-sm">
            <li>• Kategorikan otomatis (aturan by keyword).</li>
            <li>• Pantau budget & sisa per kategori.</li>
            <li>• Goal tabungan dengan progress & ETA.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
