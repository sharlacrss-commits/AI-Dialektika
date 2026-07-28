"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";
import type { Kelompok } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kodeSiswa, setKodeSiswa] = useState("");
  const [kelas, setKelas] = useState("");
  const [sekolah, setSekolah] = useState("");
  const [kelompok, setKelompok] = useState<Kelompok | "">("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kelompok) {
      setError("Pilih kelompok dulu ya.");
      return;
    }
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/masuk");
      return;
    }

    // upsert, bukan update: kalau baris profil belum sempat dibuat oleh
    // trigger on_auth_user_created, update akan mengenai 0 baris TANPA
    // error — siswa lalu terjebak di halaman ini selamanya.
    const { data: tersimpan, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          nama,
          kode_siswa: kodeSiswa.trim().toUpperCase(),
          kelas,
          sekolah,
          kelompok,
          consent: true,
          consent_at: new Date().toISOString(),
          onboarded: true,
        },
        { onConflict: "id" },
      )
      .select("id")
      .single();

    if (error || !tersimpan) {
      setError(
        error?.code === "23505"
          ? "Kode siswa itu sudah dipakai. Pakai kode lain."
          : "Gagal menyimpan: " +
              (error?.message ??
                "profil tidak tersimpan. Pastikan supabase/schema.sql sudah dijalankan."),
      );
      setLoading(false);
      return;
    }

    router.push("/beranda");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <Logo size="md" withText />
      <h1 className="mt-8 font-display text-2xl font-bold text-ink">
        Lengkapi data dulu ya
      </h1>
      <p className="mt-1 text-muted">
        Data ini dipakai untuk penelitian. Isi sesuai arahan gurumu.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Input label="Nama lengkap" value={nama} onChange={setNama} required />
        <Input
          label="Kode siswa (dari guru)"
          placeholder="contoh: EKS-012"
          value={kodeSiswa}
          onChange={setKodeSiswa}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Kelas"
            placeholder="X IPA 1"
            value={kelas}
            onChange={setKelas}
          />
          <Input
            label="Sekolah"
            placeholder="SMA ..."
            value={sekolah}
            onChange={setSekolah}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Kelompok (dari guru)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["eksperimen", "kontrol"] as Kelompok[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKelompok(k)}
                className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold capitalize transition ${
                  kelompok === k
                    ? "border-primary bg-accent-soft text-primary-press"
                    : "border-line bg-white text-muted"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Kelompok tidak bisa diubah setelah disimpan.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-bg-soft p-4 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            className="mt-0.5 size-5 accent-primary"
          />
          <span className="text-ink">
            Saya bersedia data belajar saya digunakan untuk penelitian ini.
          </span>
        </label>

        {error && (
          <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !consent}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white shadow-tosca transition hover:bg-primary-press disabled:opacity-60"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Mulai Belajar
        </button>
      </form>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-line bg-white px-4 py-3 text-base outline-none focus:border-primary placeholder:text-muted"
      />
    </div>
  );
}
