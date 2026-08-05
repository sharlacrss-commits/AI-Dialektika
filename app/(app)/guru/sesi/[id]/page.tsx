import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePemantau } from "@/lib/auth";
import { formatTanggal, formatWaktu } from "@/lib/format";
import { PenilaianManual } from "@/components/PenilaianManual";
import { Markdown } from "@/components/Markdown";
import { ArrowLeft, Paperclip, ThumbsUp, ThumbsDown } from "lucide-react";
import { KETERAMPILAN, LABEL_ALASAN, type ManualScore } from "@/lib/types";

export const dynamic = "force-dynamic";

// Satu sesi dilihat guru: transkrip lengkap, skor AI, penilaian siswa atas
// jawaban AI, dan form penilaian manual.
export default async function SesiGuruPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requirePemantau();

  const { data: sesi } = await supabase
    .from("sessions")
    .select("id, user_id, mapel, topik, status, mulai_at, selesai_at")
    .eq("id", id)
    .maybeSingle();
  if (!sesi) notFound();

  const [{ data: siswa }, { data: pesan }, { data: skor }, { data: manual }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("nama, kode_siswa, kelompok, kelas")
        .eq("id", sesi.user_id)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id, peran, isi, is_pemantik, created_at, lampiran_nama")
        .eq("session_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("scores").select("*").eq("session_id", id).maybeSingle(),
      supabase
        .from("manual_scores")
        .select("*")
        .eq("session_id", id)
        .eq("penilai_id", user.id)
        .maybeSingle(),
    ]);

  const { data: feedback } = await supabase
    .from("message_feedback")
    .select("message_id, membantu, alasan")
    .in("message_id", (pesan ?? []).map((m) => m.id));

  const petaFeedback = new Map(
    (feedback ?? []).map((f) => [f.message_id, f]),
  );

  const jumlahJawabanSiswa = (pesan ?? []).filter(
    (m) => m.peran === "user" && m.isi.trim(),
  ).length;

  const durasiMenit =
    sesi.selesai_at && sesi.mulai_at
      ? Math.round(
          (new Date(sesi.selesai_at).getTime() -
            new Date(sesi.mulai_at).getTime()) /
            60000,
        )
      : null;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <Link
        href={`/guru/siswa/${sesi.user_id}`}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> {siswa?.nama ?? "Siswa"}
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-ink">
        {sesi.mapel}
        {sesi.topik ? ` · ${sesi.topik}` : ""}
      </h1>
      <p className="mt-1 text-muted">
        {siswa?.kode_siswa ?? "—"} · kelompok{" "}
        <b className="capitalize">{siswa?.kelompok ?? "—"}</b> ·{" "}
        {formatTanggal(sesi.mulai_at)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrik label="Status" nilai={sesi.status} />
        <Metrik label="Jawaban siswa" nilai={String(jumlahJawabanSiswa)} />
        <Metrik
          label="Durasi"
          nilai={durasiMenit === null ? "—" : `${durasiMenit} mnt`}
        />
        <Metrik label="Skor AI" nilai={skor ? String(skor.skor) : "belum"} />
      </div>

      {/* --- Transkrip --- */}
      <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
        Transkrip diskusi
      </h2>
      <div className="space-y-4">
        {(pesan ?? []).length === 0 && (
          <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-muted">
            Belum ada percakapan di sesi ini.
          </p>
        )}
        {(pesan ?? []).map((m) => {
          const f = petaFeedback.get(m.id);
          return (
            <div
              key={m.id}
              className={m.peran === "user" ? "flex flex-row-reverse" : "flex"}
            >
              <div className="max-w-[88%]">
                <div
                  className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                    m.peran === "user"
                      ? "rounded-tr-sm border border-line bg-white text-ink"
                      : "rounded-tl-sm bg-accent-soft text-primary-press"
                  }`}
                >
                  {m.lampiran_nama && (
                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-bg-soft px-2 py-1 text-xs text-muted">
                      <Paperclip size={12} /> {m.lampiran_nama}
                    </span>
                  )}
                  {m.peran === "assistant" ? (
                    <Markdown teks={m.isi} />
                  ) : (
                    <span className="whitespace-pre-wrap">{m.isi}</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 px-1 text-[11px] text-muted">
                  <span>{formatWaktu(m.created_at)}</span>
                  {m.peran === "assistant" && m.is_pemantik && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-primary-press">
                      pemantik
                    </span>
                  )}
                  {f && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                        f.membantu
                          ? "bg-success-soft text-success-ink"
                          : "bg-coral/10 text-coral"
                      }`}
                    >
                      {f.membantu ? (
                        <ThumbsUp size={11} />
                      ) : (
                        <ThumbsDown size={11} />
                      )}
                      {f.alasan
                        ? LABEL_ALASAN[f.alasan as keyof typeof LABEL_ALASAN]
                        : f.membantu
                          ? "membantu"
                          : "tidak membantu"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Skor AI rinci --- */}
      {skor && (
        <section className="mt-8 rounded-2xl border border-line bg-white p-5">
          <h2 className="font-display text-lg font-bold text-ink">
            Penilaian AI
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {KETERAMPILAN.map((k) => (
              <div key={k.key} className="flex justify-between text-sm">
                <span className="text-muted">{k.label}</span>
                <b className="text-ink">
                  {skor[k.key as keyof typeof skor] as number}
                </b>
              </div>
            ))}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Baris judul="Kelebihan" isi={skor.kelebihan} />
            <Baris judul="Kekurangan" isi={skor.kekurangan} />
            <Baris judul="Saran" isi={skor.saran} />
          </dl>
        </section>
      )}

      {/* --- Penilaian manual --- */}
      <section className="mt-8 rounded-2xl border-2 border-primary/30 bg-white p-5">
        <h2 className="font-display text-lg font-bold text-ink">
          Penilaian manual Anda
        </h2>
        <p className="mt-1 mb-5 text-sm text-muted">
          Nilai transkrip di atas memakai rubrik yang sama seperti AI. Isi
          seadanya menurut penilaian Anda sendiri — jangan menyesuaikan dengan
          angka AI, karena justru selisihnyalah yang diteliti.
        </p>
        {sesi.status !== "selesai" ? (
          <p className="rounded-xl bg-bg-soft px-4 py-3 text-sm text-muted">
            Sesi ini masih berlangsung. Penilaian manual sebaiknya diisi setelah
            siswa mengakhiri sesinya.
          </p>
        ) : (
          <PenilaianManual
            sessionId={id}
            penilaiId={user.id}
            awal={(manual as ManualScore | null) ?? null}
            skorAi={
              skor
                ? (Object.fromEntries(
                    ["skor", ...KETERAMPILAN.map((k) => k.key)].map((k) => [
                      k,
                      skor[k as keyof typeof skor] as number,
                    ]),
                  ) as Record<string, number>)
                : null
            }
          />
        )}
      </section>
    </div>
  );
}

function Metrik({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-lg font-bold capitalize text-ink">
        {nilai}
      </p>
    </div>
  );
}

function Baris({ judul, isi }: { judul: string; isi: string }) {
  if (!isi) return null;
  return (
    <div>
      <dt className="font-semibold text-ink">{judul}</dt>
      <dd className="text-muted">{isi}</dd>
    </div>
  );
}
