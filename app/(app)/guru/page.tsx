import Link from "next/link";
import { requirePemantau } from "@/lib/auth";
import { formatTanggal } from "@/lib/format";
import { Users, School, TriangleAlert, ArrowRight } from "lucide-react";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

// Dasbor guru: daftar siswa di sekolah yang sama, beserta ringkasan
// aktivitas dan skornya.
//
// Batas "siswa siapa yang boleh dilihat" TIDAK diputuskan di halaman ini,
// melainkan oleh RLS di database (fungsi boleh_pantau). Jadi walaupun
// query di bawah tidak menyaring sekolah, guru tetap hanya menerima baris
// siswa di sekolahnya sendiri.
export default async function GuruPage() {
  const { supabase, user, profile } = await requirePemantau();

  const { data: semuaProfil } = await supabase
    .from("profiles")
    .select("id, nama, kode_siswa, kelompok, kelas, sekolah, role, onboarded, consent")
    .order("kode_siswa");

  const siswa = ((semuaProfil ?? []) as Profile[]).filter(
    (p) => p.role === "siswa" && p.id !== user.id,
  );

  const { data: sesi } = await supabase
    .from("sessions")
    .select("id, user_id, mapel, status, mulai_at, scores(skor)")
    .order("mulai_at", { ascending: false });

  type BarisSesi = {
    id: string;
    user_id: string;
    mapel: string;
    status: string;
    mulai_at: string;
    scores: { skor: number }[] | { skor: number } | null;
  };

  const skorDari = (s: BarisSesi) =>
    Array.isArray(s.scores) ? s.scores[0]?.skor : s.scores?.skor;

  const perSiswa = new Map<string, BarisSesi[]>();
  for (const s of (sesi ?? []) as BarisSesi[]) {
    const daftar = perSiswa.get(s.user_id) ?? [];
    daftar.push(s);
    perSiswa.set(s.user_id, daftar);
  }

  const rows = siswa.map((p) => {
    const daftar = perSiswa.get(p.id) ?? [];
    const nilai = daftar.map(skorDari).filter((n): n is number => typeof n === "number");
    return {
      profil: p,
      jumlahSesi: daftar.length,
      selesai: daftar.filter((s) => s.status === "selesai").length,
      rata: nilai.length
        ? Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 10) / 10
        : null,
      terakhir: daftar[0]?.mulai_at ?? null,
    };
  });

  // Aplikasi ini khusus kelompok eksperimen, jadi daftarnya tidak lagi
  // dipisah per kelompok. Yang lebih berguna bagi guru: berapa siswa yang
  // benar-benar sudah memakai, dan berapa yang belum tersentuh sama sekali.
  const sudahMulai = rows.filter((r) => r.jumlahSesi > 0).length;
  const belumMulai = rows.length - sudahMulai;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            Pantauan Siswa
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-muted">
            <School size={16} />
            {profile.sekolah || "Sekolah belum diisi"}
            {profile.role === "admin" && " · mode admin (semua sekolah)"}
          </p>
        </div>
        <Link
          href="/guru/rekap"
          className="flex items-center gap-1.5 rounded-xl border-2 border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-accent-soft"
        >
          Rekap penilaian <ArrowRight size={16} />
        </Link>
      </div>

      {!profile.sekolah && profile.role !== "admin" && (
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          Kolom sekolah di profil Anda masih kosong, jadi tidak ada siswa yang
          muncul. Isi lewat halaman Profil dengan ejaan yang sama seperti yang
          diisi siswa.
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Kartu label="Total siswa" nilai={rows.length} />
        <Kartu label="Sudah mulai belajar" nilai={sudahMulai} />
        <Kartu label="Belum pernah mulai" nilai={belumMulai} />
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">
          Belum ada siswa terdaftar di sekolah ini. Pastikan siswa mengisi nama
          sekolah dengan ejaan yang sama.
        </p>
      ) : (
        <Tabel judul="Daftar Siswa" rows={rows} />
      )}
    </div>
  );
}

function Kartu({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-ink">{nilai}</p>
    </div>
  );
}

type Baris = {
  profil: Profile;
  jumlahSesi: number;
  selesai: number;
  rata: number | null;
  terakhir: string | null;
};

function Tabel({ judul, rows }: { judul: string; rows: Baris[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
        <Users size={18} className="text-primary" />
        {judul}
        <span className="text-sm font-normal text-muted">({rows.length})</span>
      </h2>
      {/* Tabel lebar sengaja bisa digeser sendiri, supaya halaman tidak
          ikut bergeser saat dibuka dari HP. */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-bg-soft text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Kode</th>
              <th className="px-4 py-3 font-medium">Kelas</th>
              <th className="px-4 py-3 font-medium">Sesi</th>
              <th className="px-4 py-3 font-medium">Selesai</th>
              <th className="px-4 py-3 font-medium">Rata skor AI</th>
              <th className="px-4 py-3 font-medium">Terakhir aktif</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.profil.id} className="border-t border-line">
                {/* Nama didahulukan karena inilah yang dipakai guru untuk
                    mencocokkan dengan absen kelas. Kode siswa hanya penanda
                    pengganti nama di ekspor data penelitian. */}
                <td className="px-4 py-3">
                  <Link
                    href={`/guru/siswa/${r.profil.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {r.profil.nama ?? "(tanpa nama)"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">
                  {r.profil.kode_siswa ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted">{r.profil.kelas ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{r.jumlahSesi}</td>
                <td className="px-4 py-3 text-ink">{r.selesai}</td>
                <td className="px-4 py-3">
                  {r.rata === null ? (
                    <span className="text-muted">belum ada</span>
                  ) : (
                    <span className="font-semibold text-ink">{r.rata}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {r.terakhir ? formatTanggal(r.terakhir) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
