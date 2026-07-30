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

  // Diambil sebagai tiga query terpisah lalu digabung di sini, BUKAN dengan
  // select bersarang "sessions -> profiles(...)". Penggabungan bersarang
  // menuntut adanya foreign key sessions.user_id -> profiles.id; di database
  // produksi kolom itu menunjuk ke auth.users, sehingga PostgREST menolak
  // dengan "Could not find a relationship" dan ekspor riset selalu gagal.
  const [sesi, profil, skor] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, user_id, mapel, topik, status, mulai_at, selesai_at")
      .order("mulai_at", { ascending: true }),
    supabase.from("profiles").select("id, kode_siswa, kelompok, kelas, sekolah"),
    supabase
      .from("scores")
      .select(
        "session_id, skor, interpretasi, analisis, evaluasi, inferensi, eksplanasi, regulasi_diri",
      ),
  ]);

  const gagal = sesi.error ?? profil.error ?? skor.error;
  if (gagal) return new Response("Gagal: " + gagal.message, { status: 500 });

  const petaProfil = new Map((profil.data ?? []).map((p) => [p.id, p]));
  const petaSkor = new Map((skor.data ?? []).map((s) => [s.session_id, s]));

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

  const baris = (sesi.data ?? []).map((s) => {
    const p = petaProfil.get(s.user_id);
    const sc = petaSkor.get(s.id);
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
