import Link from "next/link";
import { requirePemantau } from "@/lib/auth";
import { ArrowLeft, Scale, TriangleAlert } from "lucide-react";
import { KETERAMPILAN } from "@/lib/types";

export const dynamic = "force-dynamic";

// Rekap kesepakatan penilaian: skor AI vs skor guru untuk sesi yang sudah
// dinilai keduanya. Ini bukti apakah penilaian AI layak dipakai sebagai
// data penelitian atau masih perlu dikoreksi manusia.
export default async function RekapPage() {
  const { supabase, user, profile } = await requirePemantau();

  const { data: manual } = await supabase
    .from("manual_scores")
    .select("*")
    .eq("penilai_id", user.id);

  const idSesi = (manual ?? []).map((m) => m.session_id);

  const { data: ai } = idSesi.length
    ? await supabase.from("scores").select("*").in("session_id", idSesi)
    : { data: [] };

  const { data: sesi } = idSesi.length
    ? await supabase
        .from("sessions")
        .select("id, user_id, mapel, mulai_at")
        .in("id", idSesi)
    : { data: [] };

  const { data: siswa } = await supabase
    .from("profiles")
    .select("id, nama, kode_siswa, kelompok");

  const petaAi = new Map((ai ?? []).map((s) => [s.session_id, s]));
  const petaSesi = new Map((sesi ?? []).map((s) => [s.id, s]));
  const petaSiswa = new Map((siswa ?? []).map((s) => [s.id, s]));

  const baris = (manual ?? [])
    .map((m) => {
      const a = petaAi.get(m.session_id);
      const s = petaSesi.get(m.session_id);
      if (!a || !s) return null;
      return {
        sessionId: m.session_id,
        siswa: petaSiswa.get(s.user_id),
        mapel: s.mapel,
        skorAi: a.skor as number,
        skorGuru: m.skor as number,
        selisih: Math.abs((a.skor as number) - (m.skor as number)),
        detail: KETERAMPILAN.map((k) => ({
          key: k.key,
          ai: a[k.key as keyof typeof a] as number,
          guru: m[k.key as keyof typeof m] as number,
        })),
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const n = baris.length;
  const rataSelisih = n
    ? Math.round((baris.reduce((t, b) => t + b.selisih, 0) / n) * 100) / 100
    : null;
  const dalam1 = baris.filter((b) => b.selisih <= 1).length;
  const dalam2 = baris.filter((b) => b.selisih <= 2).length;

  // Kecenderungan arah: AI lebih murah hati atau lebih pelit dari guru?
  const bias = n
    ? Math.round(
        (baris.reduce((t, b) => t + (b.skorAi - b.skorGuru), 0) / n) * 100,
      ) / 100
    : null;

  // Selisih rata-rata per keterampilan, untuk tahu dimensi mana yang
  // paling sering dinilai berbeda oleh AI.
  const perDimensi = KETERAMPILAN.map((k) => {
    const nilai = baris.map((b) => {
      const d = b.detail.find((x) => x.key === k.key)!;
      return d.ai - d.guru;
    });
    const rata = nilai.length
      ? Math.round((nilai.reduce((a, b) => a + b, 0) / nilai.length) * 100) / 100
      : null;
    const mutlak = nilai.length
      ? Math.round(
          (nilai.reduce((a, b) => a + Math.abs(b), 0) / nilai.length) * 100,
        ) / 100
      : null;
    return { label: k.label, rata, mutlak };
  });

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <Link
        href="/guru"
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> Pantauan siswa
      </Link>

      <h1 className="mt-4 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Scale size={24} className="text-primary" />
        Rekap: Skor AI vs Skor Guru
      </h1>
      <p className="mt-1 text-muted">
        Hanya sesi yang sudah Anda nilai manual DAN sudah dinilai AI yang
        muncul di sini{profile.role === "admin" ? "." : "."}
      </p>

      {n === 0 ? (
        <p className="mt-8 flex items-start gap-2 rounded-2xl border border-dashed border-line bg-white p-8 text-muted">
          <TriangleAlert size={20} className="mt-0.5 shrink-0" />
          Belum ada sesi yang dinilai dua-duanya. Buka satu sesi siswa yang
          sudah selesai, lalu isi penilaian manual di bagian bawah halaman.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <Kartu label="Sesi dibandingkan" nilai={String(n)} />
            <Kartu
              label="Rata-rata selisih"
              nilai={String(rataSelisih)}
              sub="poin (0 = identik)"
            />
            <Kartu
              label="Selisih ≤ 1 poin"
              nilai={`${Math.round((dalam1 / n) * 100)}%`}
              sub={`${dalam1} dari ${n}`}
            />
            <Kartu
              label="Selisih ≤ 2 poin"
              nilai={`${Math.round((dalam2 / n) * 100)}%`}
              sub={`${dalam2} dari ${n}`}
            />
          </div>

          <p className="mt-4 rounded-xl bg-bg-soft px-4 py-3 text-sm text-muted">
            <b className="text-ink">Kecenderungan AI: </b>
            {bias === null || bias === 0
              ? "seimbang dengan guru."
              : bias > 0
                ? `AI menilai rata-rata ${bias} poin LEBIH TINGGI dari Anda.`
                : `AI menilai rata-rata ${Math.abs(bias)} poin LEBIH RENDAH dari Anda.`}{" "}
            Angka ini baru bisa dipercaya kalau jumlah sesi yang dibandingkan
            sudah memadai (idealnya ≥ 20).
          </p>

          <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
            Selisih per keterampilan
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-bg-soft text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Keterampilan</th>
                  <th className="px-4 py-3 font-medium">Rata selisih (AI − guru)</th>
                  <th className="px-4 py-3 font-medium">Rata jarak mutlak</th>
                </tr>
              </thead>
              <tbody>
                {perDimensi.map((d) => (
                  <tr key={d.label} className="border-t border-line">
                    <td className="px-4 py-3 text-ink">{d.label}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          (d.rata ?? 0) > 0
                            ? "text-coral"
                            : (d.rata ?? 0) < 0
                              ? "text-primary"
                              : "text-muted"
                        }
                      >
                        {d.rata !== null && d.rata > 0 ? "+" : ""}
                        {d.rata}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink">{d.mutlak}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
            Rincian per sesi
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-bg-soft text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Siswa</th>
                  <th className="px-4 py-3 font-medium">Materi</th>
                  <th className="px-4 py-3 font-medium">AI</th>
                  <th className="px-4 py-3 font-medium">Guru</th>
                  <th className="px-4 py-3 font-medium">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {baris
                  .slice()
                  .sort((a, b) => b.selisih - a.selisih)
                  .map((b) => (
                    <tr key={b.sessionId} className="border-t border-line">
                      <td className="px-4 py-3">
                        <Link
                          href={`/guru/sesi/${b.sessionId}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {b.siswa?.kode_siswa ?? b.siswa?.nama ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{b.mapel}</td>
                      <td className="px-4 py-3 text-ink">{b.skorAi}</td>
                      <td className="px-4 py-3 text-ink">{b.skorGuru}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            b.selisih <= 1
                              ? "bg-success-soft text-success-ink"
                              : b.selisih <= 2
                                ? "bg-accent-soft text-primary-press"
                                : "bg-coral/10 text-coral"
                          }`}
                        >
                          {b.selisih}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kartu({
  label,
  nilai,
  sub,
}: {
  label: string;
  nilai: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{nilai}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
