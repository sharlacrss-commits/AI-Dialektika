"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { Mail, Lock, User, Zap, MessagesSquare, Loader2 } from "lucide-react";

export default function MasukPage() {
  // useSearchParams butuh Suspense saat halaman dirender statis oleh Next.
  return (
    <Suspense fallback={null}>
      <FormMasuk />
    </Suspense>
  );
}

function FormMasuk() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [loading, setLoading] = useState(false);
  const [google, setGoogle] = useState(false);
  // Galat dari /auth/callback (mis. siswa membatalkan izin Google).
  const [error, setError] = useState<string | null>(params.get("galat"));

  // Login Google. Alurnya: browser -> Google -> /auth/callback -> /beranda.
  // redirectTo WAJIB memakai origin saat ini supaya localhost dan produksi
  // sama-sama jalan tanpa mengubah kode.
  async function masukGoogle() {
    setGoogle(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/beranda`,
      },
    });
    if (error) {
      setError(
        "Gagal membuka login Google: " +
          error.message +
          ". Pastikan provider Google sudah aktif di Supabase.",
      );
      setGoogle(false);
    }
    // Kalau berhasil, browser berpindah ke Google — tidak ada yang perlu
    // dikerjakan lagi di sini.
  }

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

          <button
            type="button"
            onClick={masukGoogle}
            disabled={google || loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-line bg-white py-3.5 font-semibold text-ink transition hover:bg-bg-soft disabled:opacity-60"
          >
            {google ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogoGoogle />
            )}
            Masuk dengan Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">atau pakai email</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={submit} className="space-y-4">
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

// Logo Google resmi (empat warna). Dibuat inline supaya tidak menambah
// permintaan gambar dan tetap tajam di layar HP.
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-2.7-.4-3.9H24v7.1h12.1c-.2 1.9-1.6 4.7-4.5 6.6l6.9 5.3c4.1-3.8 6.6-9.3 6.6-15.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8.1 41.1 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17.1 2 20.4 2 24s.9 6.9 2.4 10l7.1-5.5z"
      />
      <path
        fill="#EA4335"
        d="M24 10.6c3.3 0 5.5 1.4 6.8 2.6l6.1-5.9C33.2 3.9 29.9 2 24 2 15.4 2 8.1 6.9 4.4 14l7.1 5.5c1.8-5.3 6.7-8.9 12.5-8.9z"
      />
    </svg>
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
