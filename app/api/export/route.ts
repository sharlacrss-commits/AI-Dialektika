import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Ekspor data riset (CSV) untuk peneliti. Dilindungi token admin.
// Pakai: /api/export?token=RAHASIA
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!process.env.ADMIN_EXPORT_TOKEN || token !== process.env.ADMIN_EXPORT_TOKEN) {
    return new Response("Akses ditolak", { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, mapel, topik, status, mulai_at, selesai_at, profiles(kode_siswa, kelompok, kelas, sekolah), scores(skor, interpretasi, analisis, evaluasi, inferensi, eksplanasi, regulasi_diri)",
    )
    .order("mulai_at", { ascending: true });

  if (error) return new Response("Gagal: " + error.message, { status: 500 });

  const kolom = [
    "kode_siswa", "kelompok", "kelas", "sekolah",
    "mapel", "topik", "status", "mulai_at", "selesai_at",
    "skor", "interpretasi", "analisis", "evaluasi",
    "inferensi", "eksplanasi", "regulasi_diri",
  ];

  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const baris = (data ?? []).map((s) => {
    const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    const sc = Array.isArray(s.scores) ? s.scores[0] : s.scores;
    return [
      p?.kode_siswa, p?.kelompok, p?.kelas, p?.sekolah,
      s.mapel, s.topik, s.status, s.mulai_at, s.selesai_at,
      sc?.skor, sc?.interpretasi, sc?.analisis, sc?.evaluasi,
      sc?.inferensi, sc?.eksplanasi, sc?.regulasi_diri,
    ].map(esc).join(",");
  });

  const csv = [kolom.join(","), ...baris].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dialektika-data-riset.csv"',
    },
  });
}
