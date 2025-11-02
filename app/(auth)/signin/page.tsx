"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Image from "next/image";

const Schema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Minimal 8 karakter"),
});
type FormValues = z.infer<typeof Schema>;

export default function SignInPage() {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(Schema), mode: "onChange" });

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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="w-full flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="mb-4 text-center">
              <Image src="/icons/wefinansio_logo_bluegrad_full.png" alt="weFinansio" width={80} height={80} className="mx-auto" />
              <h1 className="mt-3 text-2xl font-semibold">Masuk</h1>
              <p className="text-sm text-muted-foreground">Akses dashboard keuanganmu</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="nama@email.com" {...register("email")} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label>Kata sandi</Label>
                <Input type="password" placeholder="********" {...register("password")} />
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            <div className="mt-3">
              <Button variant="outline" className="w-full gap-2"
                onClick={() => signIn("google", { callbackUrl: "/" })}>
                <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={20} height={20} className="h-5 w-5" />
                Masuk dengan Google
              </Button>
            </div>

            <p className="mt-4 text-center text-sm">
              Belum punya akun?{" "}
              <a className="text-primary hover:underline" href="/signup">Daftar</a>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex bg-gradient-to-b from-blue-600 to-blue-500 text-white p-10">
        <div className="m-auto max-w-md">
          <h2 className="text-3xl font-bold leading-snug">
            Sadar, rencanakan, konsisten — bareng weFinansio.
          </h2>
          <p className="mt-4 opacity-90">Catat rapi, keputusan lebih pasti.</p>
        </div>
      </div>
    </div>
  );
}
