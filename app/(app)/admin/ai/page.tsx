import { requireAdmin } from "@/lib/auth";
import { Activity, TriangleAlert, Gauge, Coins } from "lucide-react";
import { LABEL_ALASAN, type AiCall } from "@/lib/types";

export const dynamic = "force-dynamic";

// Ambang waktu tunggu yang masih terasa wajar bagi siswa SMA yang membuka
// aplikasi dari HP. Di atas ini, siswa mulai mengira aplikasinya hang.
const AMBANG_TTFB_MS = 4000;

function persentil(angka: number[], p: number) {
  if (angka.length === 0) return null;
  const urut = [...angka].sort((a, b) => a - b);
  const i = Math.min(urut.length - 1, Math.floor((p / 100) * urut.length));
  return urut[i];
}

const detik = (ms: number | null) =>
  ms === null ? "—" : `${(ms / 1000).toFixed(1)} dtk`;

// Dasbor performa AI untuk peneliti/admin. Tiga pertanyaan yang dijawab:
//   1. Apakah AI-nya cepat? (latensi)
//   2. Apakah AI-nya andal? (tingkat gagal)
//   3. Apakah jawabannya berkualitas menurut siswa? (feedback)
export default async function AdminAiPage() {
  const { supabase } = await requireAdmin();

  const { data: panggilan } = await supabase
    .from("ai_calls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  const semua = (panggilan ?? []) as AiCall[];
  const chat = semua.filter((c) => c.jenis === "chat");
  const nilai = semua.filter((c) => c.jenis === "nilai");

  const ttfb = chat.map((c) => c.ttfb_ms).filter((n): n is number => n !== null);
  const total = semua.length;
  const gagal = semua.filter((c) => c.status === "error");
  const fallback = semua.filter((c) => c.pakai_fallback);
  const tokenTotal = semua.reduce((t, c) => t + (c.total_tokens ?? 0), 0);
  const lambat = ttfb.filter((t) => t > AMBANG_TTFB_MS).length;

  const { data: feedback } = await supabase
    .from("message_feedback")
    .select("membantu, alasan");
  const fb = feedback ?? [];
  const fbMembantu = fb.filter((f) => f.membantu).length;

  // Hitung alasan terbanyak. "langsung_menjawab" adalah alarm khusus:
  // artinya AI melanggar persona Sokratik yang jadi inti penelitian.
  const hitungAlasan = new Map<string, number>();
  for (const f of fb) {
    if (!f.alasan) continue;
    hitungAlasan.set(f.alasan, (hitungAlasan.get(f.alasan) ?? 0) + 1);
  }
  const alasanUrut = [...hitungAlasan.entries()].sort((a, b) => b[1] - a[1]);
  const bocorJawaban = hitungAlasan.get("langsung_menjawab") ?? 0;

  // Rekap per model, supaya admin bisa membandingkan sebelum mengganti
  // model di halaman Pengaturan.
  const perModel = new Map<string, AiCall[]>();
  for (const c of semua) {
    const k = c.model ?? "(gagal semua)";
    perModel.set(k, [...(perModel.get(k) ?? []), c]);
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Activity size={24} className="text-primary" />
        Performa AI
      </h1>
      <p className="mt-1 text-muted">
        Ringkasan {total} panggilan terakhir ke Sumopod.
      </p>

      {total === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">
          Belum ada data. Angka akan muncul setelah siswa memakai aplikasi.
        </p>
      ) : (
        <>
          {/* --- Kecepatan & keandalan --- */}
          <h2 className="mt-8 mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Gauge size={18} className="text-primary" /> Kecepatan & keandalan
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
            <Kartu
              label="Jeda huruf pertama (tengah)"
              nilai={detik(persentil(ttfb, 50))}
              sub="yang dirasakan separuh siswa"
            />
            <Kartu
              label="Jeda huruf pertama (p90)"
              nilai={detik(persentil(ttfb, 90))}
              sub="10% siswa menunggu lebih lama dari ini"
            />
            <Kartu
              label="Panggilan gagal"
              nilai={`${Math.round((gagal.length / total) * 100)}%`}
              sub={`${gagal.length} dari ${total}`}
              bahaya={gagal.length / total > 0.05}
            />
            <Kartu
              label="Terpaksa pakai model cadangan"
              nilai={`${Math.round((fallback.length / total) * 100)}%`}
              sub={`${fallback.length} panggilan`}
              bahaya={fallback.length / total > 0.1}
            />
          </div>

          {ttfb.length > 0 && lambat / ttfb.length > 0.2 && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              {Math.round((lambat / ttfb.length) * 100)}% balasan butuh lebih
              dari {AMBANG_TTFB_MS / 1000} detik sebelum huruf pertama muncul.
              Pertimbangkan mengganti model utama di halaman Pengaturan.
            </p>
          )}

          {/* --- Pemakaian --- */}
          <h2 className="mt-8 mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink">
            <Coins size={18} className="text-primary" /> Pemakaian token
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Kartu label="Total token" nilai={tokenTotal.toLocaleString("id-ID")} />
            <Kartu
              label="Rata token per balasan"
              nilai={
                chat.length
                  ? Math.round(
                      chat.reduce((t, c) => t + (c.total_tokens ?? 0), 0) /
                        chat.length,
                    ).toLocaleString("id-ID")
                  : "—"
              }
            />
            <Kartu
              label="Rata token per penilaian"
              nilai={
                nilai.length
                  ? Math.round(
                      nilai.reduce((t, c) => t + (c.total_tokens ?? 0), 0) /
                        nilai.length,
                    ).toLocaleString("id-ID")
                  : "—"
              }
            />
          </div>

          {/* --- Per model --- */}
          <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
            Perbandingan model
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-bg-soft text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">Panggilan</th>
                  <th className="px-4 py-3 font-medium">Gagal</th>
                  <th className="px-4 py-3 font-medium">Jeda tengah</th>
                  <th className="px-4 py-3 font-medium">Rata token</th>
                </tr>
              </thead>
              <tbody>
                {[...perModel.entries()].map(([model, daftar]) => {
                  const t = daftar
                    .map((c) => c.ttfb_ms)
                    .filter((n): n is number => n !== null);
                  const g = daftar.filter((c) => c.status === "error").length;
                  const tok = daftar.filter((c) => c.total_tokens);
                  return (
                    <tr key={model} className="border-t border-line">
                      <td className="px-4 py-3 font-medium text-ink">{model}</td>
                      <td className="px-4 py-3 text-ink">{daftar.length}</td>
                      <td className="px-4 py-3 text-ink">{g}</td>
                      <td className="px-4 py-3 text-ink">
                        {detik(persentil(t, 50))}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {tok.length
                          ? Math.round(
                              tok.reduce((s, c) => s + (c.total_tokens ?? 0), 0) /
                                tok.length,
                            )
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* --- Kualitas menurut siswa --- */}
          <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
            Kualitas jawaban menurut siswa
          </h2>
          {fb.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-muted">
              Belum ada siswa yang menilai jawaban AI.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Kartu
                  label="Dinilai membantu"
                  nilai={`${Math.round((fbMembantu / fb.length) * 100)}%`}
                  sub={`${fbMembantu} dari ${fb.length} penilaian`}
                />
                <Kartu
                  label="Keluhan 'langsung kasih jawaban'"
                  nilai={String(bocorJawaban)}
                  sub="pelanggaran persona Sokratik"
                  bahaya={bocorJawaban > 0}
                />
                <Kartu label="Total penilaian" nilai={String(fb.length)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {alasanUrut.map(([kunci, jumlah]) => (
                  <span
                    key={kunci}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink"
                  >
                    {LABEL_ALASAN[kunci as keyof typeof LABEL_ALASAN] ?? kunci}
                    <b className="ml-1.5 text-primary">{jumlah}</b>
                  </span>
                ))}
              </div>
            </>
          )}

          {/* --- Kegagalan terakhir --- */}
          {gagal.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 font-display text-lg font-bold text-ink">
                Kegagalan terakhir
              </h2>
              <div className="space-y-2">
                {gagal.slice(0, 10).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-line bg-white px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-muted">
                      <span className="rounded bg-coral/10 px-2 py-0.5 font-semibold text-coral">
                        {c.http_status ?? "?"}
                      </span>
                      <span>{c.jenis}</span>
                      <span>{c.model ?? c.model_diminta}</span>
                      <span>{new Date(c.created_at).toLocaleString("id-ID")}</span>
                    </div>
                    {c.pesan_error && (
                      <p className="mt-1 break-words text-ink">{c.pesan_error}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Kartu({
  label,
  nilai,
  sub,
  bahaya,
}: {
  label: string;
  nilai: string;
  sub?: string;
  bahaya?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${
        bahaya ? "border-coral/40" : "border-line"
      }`}
    >
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-1 font-display text-2xl font-bold ${
          bahaya ? "text-coral" : "text-ink"
        }`}
      >
        {nilai}
      </p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
