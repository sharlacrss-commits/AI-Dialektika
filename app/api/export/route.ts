import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Perbandingan token yang tidak membocorkan isinya lewat selisih waktu.
// Perbandingan `a !== b` biasa berhenti di karakter pertama yang berbeda,
// sehingga token bisa ditebak karakter demi karakter.
function samaAman(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Ekspor data riset (CSV) untuk peneliti.
//
// Dua cara memakainya:
//  1. Sudah login sebagai admin di browser -> cukup buka /api/export
//  2. Dari terminal/skrip -> kirim header:
//       curl -H "Authorization: Bearer <ADMIN_EXPORT_TOKEN>" .../api/export
//
// Cara lama `?token=...` masih dilayani demi kompatibilitas, tapi TIDAK
// dianjurkan: query string tercatat di log akses Vercel, riwayat browser,
// dan header Referer — token penelitian jadi ikut tersimpan di tempat
// yang tidak Anda kendalikan.
async function berwenang(req: NextRequest): Promise<boolean> {
  // Jalur 1: sesi admin yang sedang login.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profil?.role === "admin") return true;
    }
  } catch {
    // Tidak ada cookie sesi (dipanggil dari curl). Lanjut ke jalur token.
  }

  // Jalur 2: token admin.
  const rahasia = process.env.ADMIN_EXPORT_TOKEN;
  // Token pendek/kosong dianggap tidak dipasang. Tanpa penjagaan ini,
  // ADMIN_EXPORT_TOKEN yang lupa diisi bisa membuat endpoint terbuka.
  if (!rahasia || rahasia.length < 24) return false;

  const header = req.headers.get("authorization") ?? "";
  const dariHeader = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const dariQuery = req.nextUrl.searchParams.get("token") ?? "";
  const dikirim = dariHeader || dariQuery;
  if (!dikirim) return false;

  return samaAman(dikirim, rahasia);
}

export async function GET(req: NextRequest) {
  if (!(await berwenang(req))) {
    return new Response("Akses ditolak", { status: 401 });
  }

  const supabase = createAdminClient();

  // Diambil sebagai query terpisah lalu digabung di sini, BUKAN dengan
  // select bersarang "sessions -> profiles(...)". Penggabungan bersarang
  // menuntut adanya foreign key sessions.user_id -> profiles.id; di database
  // produksi kolom itu menunjuk ke auth.users, sehingga PostgREST menolak
  // dengan "Could not find a relationship" dan ekspor riset selalu gagal.
  const [sesi, profil, skor, manual, pesan] = await Promise.all([
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
    supabase
      .from("manual_scores")
      .select(
        "session_id, skor, interpretasi, analisis, evaluasi, inferensi, eksplanasi, regulasi_diri",
      ),
    supabase.from("messages").select("session_id, peran, isi"),
  ]);

  const gagal =
    sesi.error ?? profil.error ?? skor.error ?? manual.error ?? pesan.error;
  if (gagal) return new Response("Gagal: " + gagal.message, { status: 500 });

  const petaProfil = new Map((profil.data ?? []).map((p) => [p.id, p]));
  const petaSkor = new Map((skor.data ?? []).map((s) => [s.session_id, s]));

  // Kalau satu sesi dinilai lebih dari satu guru, yang pertama yang dipakai.
  type BarisManual = NonNullable<typeof manual.data>[number];
  const petaManual = new Map<string, BarisManual>();
  for (const m of manual.data ?? [])
    if (!petaManual.has(m.session_id)) petaManual.set(m.session_id, m);

  // Ukuran keterlibatan siswa. Dipakai untuk menyaring sesi yang terlalu
  // pendek saat analisis (mis. siswa membuka lalu langsung menekan Nilai).
  const hitungPesan = new Map<
    string,
    { siswa: number; ai: number; kata: number }
  >();
  for (const m of pesan.data ?? []) {
    const h = hitungPesan.get(m.session_id) ?? { siswa: 0, ai: 0, kata: 0 };
    if (m.peran === "user") {
      h.siswa += 1;
      h.kata += (m.isi ?? "").trim().split(/\s+/).filter(Boolean).length;
    } else {
      h.ai += 1;
    }
    hitungPesan.set(m.session_id, h);
  }

  const kolom = [
    "kode_siswa", "kelompok", "kelas", "sekolah",
    "mapel", "topik", "status", "mulai_at", "selesai_at", "durasi_menit",
    "pesan_siswa", "pesan_ai", "kata_siswa",
    "skor", "interpretasi", "analisis", "evaluasi",
    "inferensi", "eksplanasi", "regulasi_diri",
    "guru_skor", "guru_interpretasi", "guru_analisis", "guru_evaluasi",
    "guru_inferensi", "guru_eksplanasi", "guru_regulasi_diri",
    "selisih_skor",
  ];

  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const baris = (sesi.data ?? []).map((s) => {
    const p = petaProfil.get(s.user_id);
    const sc = petaSkor.get(s.id);
    const mn = petaManual.get(s.id);
    const h = hitungPesan.get(s.id) ?? { siswa: 0, ai: 0, kata: 0 };
    const durasi =
      s.selesai_at && s.mulai_at
        ? Math.round(
            (new Date(s.selesai_at).getTime() -
              new Date(s.mulai_at).getTime()) /
              60000,
          )
        : "";
    const selisih = sc && mn ? Math.abs((sc.skor ?? 0) - (mn.skor ?? 0)) : "";
    return [
      p?.kode_siswa, p?.kelompok, p?.kelas, p?.sekolah,
      s.mapel, s.topik, s.status, s.mulai_at, s.selesai_at, durasi,
      h.siswa, h.ai, h.kata,
      sc?.skor, sc?.interpretasi, sc?.analisis, sc?.evaluasi,
      sc?.inferensi, sc?.eksplanasi, sc?.regulasi_diri,
      mn?.skor, mn?.interpretasi, mn?.analisis, mn?.evaluasi,
      mn?.inferensi, mn?.eksplanasi, mn?.regulasi_diri,
      selisih,
    ].map(esc).join(",");
  });

  // BOM UTF-8 supaya Excel di Windows tidak merusak huruf beraksen saat
  // file dibuka dengan klik dua kali.
  const csv = "﻿" + [kolom.join(","), ...baris].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dialektika-data-riset.csv"',
      // Data penelitian tidak boleh nyangkut di cache perantara.
      "Cache-Control": "no-store",
    },
  });
}
