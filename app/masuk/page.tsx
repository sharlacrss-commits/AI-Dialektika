"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { Mail, Lock, User, Zap, MessagesSquare, Loader2 } from "lucide-react";

export default function MasukPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "daftar") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: sandi,
        options: { data: { nama } },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data.session) {
        // Konfirmasi email aktif. Coba login langsung.
        const { error: e2 } = await supabase.auth.signInWithPassword({
          email,
          password: sandi,
        });
        if (e2) {
          setError(
            "Akun dibuat, tapi perlu konfirmasi email. Minta admin mematikan konfirmasi email, lalu masuk lagi.",
          );
          setLoading(false);
          return;
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: sandi,
      });
      if (error) {
        setError("Email atau kata sandi salah.");
        setLoading(false);
        return;
      }
    }

    router.push("/beranda");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel kiri (desktop): sambutan */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/images/login.jpg"
          alt="Siswa sedang belajar"
          fill
          sizes="50vw"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary-press/95" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <Logo size="lg" withText />
          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold leading-tight">
              Belajar lebih cerdas, bukan lebih keras.
            </h1>
            <p className="mt-4 text-lg text-white/90">
              Dialektika tidak langsung memberi jawaban. Ia mengajakmu berpikir,
              lalu menemukan jawabannya sendiri.
            </p>
          </div>
          <p className="text-sm text-white/70">
            Teman belajar berpikir untuk siswa SMA Indonesia.
          </p>
        </div>
      </div>

      {/* Panel kanan: form */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Logo size="md" withText />
          </div>

          <h2 className="mt-8 font-display text-2xl font-bold text-ink">
            {mode === "masuk" ? "Selamat datang kembali" : "Buat akun baru"}
          </h2>
          <p className="mt-1 text-muted">
            Teman belajar yang mengajakmu berpikir.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "daftar" && (
              <Field
                icon={<User size={18} />}
                placeholder="Nama lengkap"
                value={nama}
                onChange={setNama}
                required
              />
            )}
            <Field
              icon={<Mail size={18} />}
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              icon={<Lock size={18} />}
              type="password"
              placeholder="Kata sandi (min. 6 karakter)"
              value={sandi}
              onChange={setSandi}
              required
            />

            {error && (
              <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white shadow-tosca transition hover:bg-primary-press disabled:opacity-60"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {mode === "masuk" ? "Masuk" : "Daftar Sekarang"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {mode === "masuk" ? "Belum punya akun? " : "Sudah punya akun? "}
            <button
              onClick={() => {
                setMode(mode === "masuk" ? "daftar" : "masuk");
                setError(null);
              }}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "masuk" ? "Daftar" : "Masuk"}
            </button>
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Highlight
              icon={<Zap size={18} className="text-primary" />}
              title="Paham Cepat"
              desc="Konsep sulit jadi mudah."
            />
            <Highlight
              icon={<MessagesSquare size={18} className="text-primary" />}
              title="Diskusi Aktif"
              desc="Tanya apa saja, kapan saja."
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-line bg-white px-4 py-3 focus-within:border-primary">
      <span className="text-muted">{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-base outline-none placeholder:text-muted"
      />
    </div>
  );
}

function Highlight({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl bg-bg-soft p-4">
      <div className="mb-2 grid size-9 place-items-center rounded-lg bg-accent-soft">
        {icon}
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="text-xs text-muted">{desc}</p>
    </div>
  );
}
