"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { Loader2, LogOut } from "lucide-react";
import type { Role } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [sekolah, setSekolah] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keluar, setKeluar] = useState(false);
  const [role, setRole] = useState<Role>("siswa");
  const [siap, setSiap] = useState(false);

  // Ambil nama yang sudah ada supaya siswa yang masuk lewat Google tidak
  // perlu mengetik ulang namanya. Google mengisi user_metadata.full_name,
  // dan trigger di database menyalinnya ke profiles.nama.
  //
  // Sekalian membaca role: guru/admin tidak ikut penelitian, jadi form
  // yang ditampilkan berbeda (tanpa kode siswa, kelompok, dan persetujuan).
  useEffect(() => {
    let batal = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/masuk");
        return;
      }
      const { data: profil } = await supabase
        .from("profiles")
        .select("nama, kelas, sekolah, role")
        .eq("id", user.id)
        .single();
      if (batal) return;

      const meta = user.user_metadata ?? {};
      setNama(profil?.nama || meta.nama || meta.full_name || meta.name || "");
      setKelas(profil?.kelas ?? "");
      setSekolah(profil?.sekolah ?? "");
      if (profil?.role) setRole(profil.role as Role);
      setSiap(true);
    })();
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const siswa = role === "siswa";

  // Jalan keluar dari halaman ini. WAJIB ada: selama profil belum
  // onboarded, /masuk memantulkan ke /beranda dan /beranda memantulkan
  // balik ke sini. Tanpa tombol ini siswa yang gagal menyimpan data
  // terkunci total dan satu-satunya jalan keluar adalah menghapus cookie
  // browser — tidak masuk akal untuk siswa SMA.
  async function keluarAkun() {
    setKeluar(true);
    await supabase.auth.signOut();
    router.push("/masuk");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!siswa && !sekolah.trim()) {
      setError(
        "Nama sekolah wajib diisi. Daftar siswa yang bisa kamu pantau ditentukan dari sekolah ini.",
      );
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

    // Kode siswa dan kelompok TIDAK dikirim dari sini. Keduanya diisi
    // otomatis oleh trigger di database (supabase/005-sederhanakan-onboarding.sql):
    // kode dipakai untuk menyamarkan identitas di ekspor penelitian, dan
    // semua pengguna aplikasi ini termasuk kelompok eksperimen.
    //
    // Guru/admin tidak mengisi persetujuan riset — itu khusus subjek penelitian.
    const isi = siswa
      ? {
          nama,
          kelas,
          sekolah: sekolah.trim(),
          consent: true,
          consent_at: new Date().toISOString(),
          onboarded: true,
        }
      : { nama, kelas, sekolah: sekolah.trim(), onboarded: true };

    // Dua tahap, JANGAN pakai upsert. Upsert selalu meminta izin INSERT
    // walau barisnya sudah ada, dan kebijakan RLS umumnya hanya mengizinkan
    // siswa meng-UPDATE profilnya sendiri -> ditolak 403.
    //
    // Tahap 1: update biasa. Ini jalur normal, karena trigger
    // on_auth_user_created sudah membuat barisnya saat siswa mendaftar.
    const { data: terupdate, error: errUpdate } = await supabase
      .from("profiles")
      .update(isi)
      .eq("id", user.id)
      .select("id");

    if (errUpdate) {
      setError("Gagal menyimpan: " + errUpdate.message);
      setLoading(false);
      return;
    }

    // Tahap 2: hanya kalau barisnya benar-benar belum ada (trigger tidak
    // terpasang). Tanpa ini update mengenai 0 baris tanpa error dan siswa
    // terjebak di halaman ini selamanya.
    if (!terupdate || terupdate.length === 0) {
      const { error: errInsert } = await supabase
        .from("profiles")
        .insert({ id: user.id, ...isi });
      if (errInsert) {
        setError(
          "Profil belum dibuat di database. Minta admin menjalankan " +
            "supabase/schema.sql di Supabase SQL Editor. (" +
            errInsert.message +
            ")",
        );
        setLoading(false);
        return;
      }
    }

    router.push(siswa ? "/beranda" : "/guru");
    router.refresh();
  }

  if (!siap) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <div className="flex items-center justify-between gap-3">
        <Logo size="md" withText />
        <button
          type="button"
          onClick={keluarAkun}
          disabled={keluar}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition hover:bg-bg-soft hover:text-ink disabled:opacity-60"
        >
          {keluar ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <LogOut size={15} />
          )}
          Keluar
        </button>
      </div>
      <h1 className="mt-8 font-display text-2xl font-bold text-ink">
        Lengkapi data dulu ya
      </h1>
      <p className="mt-1 text-muted">
        {siswa
          ? "Data ini dipakai untuk penelitian. Isi sesuai arahan gurumu."
          : "Data ini menentukan siswa mana yang bisa Anda pantau."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Input
          label="Nama lengkap"
          placeholder={siswa ? "Tulis seperti di absen kelas" : undefined}
          value={nama}
          onChange={setNama}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={siswa ? "Kelas" : "Kelas yang diampu"}
            placeholder="X IPA 1"
            value={kelas}
            onChange={setKelas}
          />
          <Input
            label="Sekolah"
            placeholder="SMA ..."
            value={sekolah}
            onChange={setSekolah}
            required={!siswa}
          />
        </div>
        {!siswa && (
          <p className="rounded-xl bg-bg-soft px-4 py-3 text-xs text-muted">
            Tulis nama sekolah <b>persis sama</b> dengan yang diisi siswa.
            Besar-kecil huruf boleh berbeda, tapi ejaannya harus sama —
            kalau tidak, daftar siswa Anda akan kosong.
          </p>
        )}

        {siswa && (
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
        )}

        {error && (
          <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || (siswa && !consent)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white shadow-tosca transition hover:bg-primary-press disabled:opacity-60"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {siswa ? "Mulai Belajar" : "Masuk ke Dasbor"}
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
