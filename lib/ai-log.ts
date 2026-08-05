import { createAdminClient } from "@/lib/supabase/admin";
import type { Pemakaian } from "@/lib/sumopod";

// Pencatat performa AI. Satu baris per panggilan ke Sumopod, masuk ke
// tabel ai_calls dan ditampilkan di /admin/ai.
//
// Ditulis dengan klien service-role karena:
//  - siswa TIDAK boleh menulis (apalagi mengarang) data performa; dan
//  - pencatatan sering terjadi SETELAH respons mulai mengalir, saat
//    Next.js sudah menutup akses cookie, sehingga klien biasa kehilangan
//    identitas dan ditolak RLS.

export type CatatanPanggilan = {
  userId: string | null;
  sessionId: string | null;
  jenis: "chat" | "nilai";
  modelDiminta: string | null;
  model: string | null;
  pakaiFallback: boolean;
  status: "ok" | "error";
  httpStatus: number | null;
  ttfbMs: number | null;
  latensiMs: number | null;
  pemakaian?: Pemakaian | null;
  jumlahLampiran?: number;
  pesanError?: string | null;
};

export async function catatPanggilanAI(c: CatatanPanggilan) {
  // Pencatatan TIDAK BOLEH menggagalkan permintaan siswa. Kalau service
  // role belum diisi atau insert-nya gagal, cukup dicatat di log server.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[ai-log] SUPABASE_SERVICE_ROLE_KEY kosong — performa AI tidak tercatat.");
    return;
  }
  try {
    const { error } = await createAdminClient().from("ai_calls").insert({
      user_id: c.userId,
      session_id: c.sessionId,
      jenis: c.jenis,
      model_diminta: c.modelDiminta,
      model: c.model,
      pakai_fallback: c.pakaiFallback,
      status: c.status,
      http_status: c.httpStatus,
      ttfb_ms: c.ttfbMs,
      latensi_ms: c.latensiMs,
      prompt_tokens: c.pemakaian?.prompt_tokens ?? null,
      completion_tokens: c.pemakaian?.completion_tokens ?? null,
      total_tokens: c.pemakaian?.total_tokens ?? null,
      jumlah_lampiran: c.jumlahLampiran ?? 0,
      // Dipangkas supaya satu error panjang tidak membengkakkan tabel.
      pesan_error: c.pesanError ? c.pesanError.slice(0, 500) : null,
    });
    if (error) console.error("[ai-log] gagal mencatat:", error.message);
  } catch (e) {
    console.error("[ai-log] gagal mencatat:", (e as Error).message);
  }
}

// Pembatas laju sederhana berbasis tabel ai_calls: berapa panggilan yang
// dibuat satu siswa dalam jendela waktu terakhir.
//
// Alasannya bukan keamanan semata tapi BIAYA: tanpa ini satu siswa (atau
// satu skrip iseng) bisa menghabiskan saldo Sumopod untuk seluruh
// penelitian dalam hitungan menit.
export async function lewatBatasLaju(
  userId: string,
  maks = 20,
  jendelaDetik = 60,
): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const sejak = new Date(Date.now() - jendelaDetik * 1000).toISOString();
  const { count, error } = await createAdminClient()
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sejak);
  // Kalau pemeriksaannya sendiri gagal, jangan kunci siswa — biarkan lewat.
  if (error) return false;
  return (count ?? 0) >= maks;
}
