import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePemantau } from "@/lib/auth";
import { formatTanggal } from "@/lib/format";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Riwayat sesi satu siswa, dilihat dari sisi guru.
// RLS (boleh_pantau) yang memastikan guru hanya bisa membuka siswa di
// sekolahnya; kalau bukan, query di bawah tidak mengembalikan baris apa pun
// dan halaman ini menjadi 404 — bukan "akses ditolak" yang malah
// membocorkan bahwa siswa itu ada.
export default async function SiswaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requirePemantau();

  const { data: siswa } = await supabase
    .from("profiles")
    .select("id, nama, kode_siswa, kelompok, kelas, sekolah")
    .eq("id", id)
    .maybeSingle();
  if (!siswa) notFound();

  const { data: sesi } = await supabase
    .from("sessions")
    .select("id, mapel, topik, status, mulai_at, selesai_at, scores(skor)")
    .eq("user_id", id)
    .order("mulai_at", { ascending: false });

  const { data: manual } = await supabase
    .from("manual_scores")
    .select("session_id, skor")
    .in("session_id", (sesi ?? []).map((s) => s.id));

  const petaManual = new Map((manual ?? []).map((m) => [m.session_id, m.skor]));

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <Link
        href="/guru"
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> Pantauan siswa
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-ink">
        {siswa.nama ?? "Tanpa nama"}
      </h1>
      <p className="mt-1 text-muted">
        {siswa.kelas || "kelas belum diisi"} · kode{" "}
        <b>{siswa.kode_siswa ?? "—"}</b>
      </p>

      <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
        Sesi belajar ({sesi?.length ?? 0})
      </h2>

      {(sesi ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-muted">
          Siswa ini belum pernah memulai sesi.
        </p>
      ) : (
        <div className="space-y-3">
          {(sesi ?? []).map((s) => {
            const skorAi = Array.isArray(s.scores)
              ? s.scores[0]?.skor
              : (s.scores as { skor: number } | null)?.skor;
            const skorGuru = petaManual.get(s.id);
            return (
              <Link
                key={s.id}
                href={`/guru/sesi/${s.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white p-4 transition hover:shadow-tosca-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {s.mapel}
                    {s.topik ? ` · ${s.topik}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {formatTanggal(s.mulai_at)}
                    {s.status === "berlangsung" && " · masih berlangsung"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Nilai label="AI" nilai={skorAi} />
                  <Nilai label="Guru" nilai={skorGuru} guru />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 rounded-xl bg-bg-soft px-4 py-3 text-sm text-muted">
        <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-primary" />
        Buka satu sesi untuk membaca transkripnya dan mengisi penilaian manual.
        Selisih skor AI dan skor guru dipakai untuk menguji seberapa bisa
        dipercaya penilaian AI.
      </p>
    </div>
  );
}

function Nilai({
  label,
  nilai,
  guru,
}: {
  label: string;
  nilai?: number | null;
  guru?: boolean;
}) {
  return (
    <span className="text-center">
      <span className="block text-[10px] uppercase tracking-wide text-muted">
        {label}
      </span>
      <span
        className={`grid size-9 place-items-center rounded-full font-display text-sm font-bold ${
          typeof nilai === "number"
            ? guru
              ? "bg-success-soft text-success-ink"
              : "bg-accent-soft text-primary-press"
            : "border border-dashed border-line text-muted"
        }`}
      >
        {typeof nilai === "number" ? nilai : "–"}
      </span>
    </span>
  );
}
