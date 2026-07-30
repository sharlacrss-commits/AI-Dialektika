import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sumopodChat, type ChatMessage } from "@/lib/sumopod";
import { SYSTEM_PENILAIAN, SKEMA_SKOR, FIELD_ANGKA } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

// Hanya membatasi rentang ke 1-10. TIDAK boleh dipakai untuk menambal nilai
// yang tidak ada — itu yang dulu membuat field tak terbaca tersimpan sebagai
// skor 1. Ketidaklengkapan diperiksa terpisah di bawah.
const clamp = (n: unknown) => Math.min(10, Math.max(1, Math.round(Number(n))));

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Belum masuk", { status: 401 });

  const { data: sesi } = await supabase
    .from("sessions")
    .select("id, mapel, topik, user_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!sesi) return new Response("Sesi tidak ditemukan", { status: 404 });

  const { data: pesan } = await supabase
    .from("messages")
    .select("peran, isi")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const transkrip = (pesan ?? [])
    .map((m) => `${m.peran === "user" ? "Siswa" : "Dialektika"}: ${m.isi}`)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PENILAIAN },
    {
      role: "user",
      content: `Materi: ${sesi.mapel}${sesi.topik ? ` (topik: ${sesi.topik})` : ""}.\n\nTranskrip diskusi:\n${transkrip || "(belum ada diskusi)"}\n\nNilai sekarang. Keluarkan HANYA JSON.`,
    },
  ];

  const { data: setting } = await supabase
    .from("app_settings")
    .select("chat_model, fallback_model")
    .eq("id", "global")
    .single();
  const models = setting
    ? [setting.chat_model, setting.fallback_model]
    : undefined;

  const aiRes = await sumopodChat({
    messages,
    temperature: 0.3,
    models,
    response_format: SKEMA_SKOR,
  });
  if (!aiRes.ok) {
    const d = await aiRes.text().catch(() => "");
    return new Response("AI gagal menilai. " + d, { status: 502 });
  }
  const data = await aiRes.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        parsed = null;
      }
    }
  }
  if (!parsed) return new Response("Format nilai tidak terbaca", { status: 502 });

  // Jaring pengaman: kalau model tetap memakai nama lain (mis. pernah
  // menjawab "skor_keseluruhan"), pakai padanannya.
  if (parsed.skor === undefined)
    parsed.skor = parsed.skor_keseluruhan ?? parsed.nilai ?? parsed.total;

  // Lebih baik GAGAL TERANG-TERANGAN daripada menyimpan skor palsu. Data
  // penilaian ini dipakai untuk penelitian, jadi angka yang tidak benar
  // jauh lebih berbahaya daripada permintaan yang gagal.
  const hilang = FIELD_ANGKA.filter(
    (k) => !Number.isFinite(Number(parsed![k])),
  );
  if (hilang.length > 0) {
    console.error("[nilai] field angka tidak terbaca:", hilang, text.slice(0, 300));
    return new Response(
      "Penilaian tidak lengkap (" + hilang.join(", ") + "). Coba nilai ulang.",
      { status: 502 },
    );
  }

  const row = {
    session_id: sessionId,
    skor: clamp(parsed.skor),
    interpretasi: clamp(parsed.interpretasi),
    analisis: clamp(parsed.analisis),
    evaluasi: clamp(parsed.evaluasi),
    inferensi: clamp(parsed.inferensi),
    eksplanasi: clamp(parsed.eksplanasi),
    regulasi_diri: clamp(parsed.regulasi_diri),
    kelebihan: String(parsed.kelebihan ?? ""),
    kekurangan: String(parsed.kekurangan ?? ""),
    saran: String(parsed.saran ?? ""),
  };

  const { error: errScore } = await supabase
    .from("scores")
    .upsert(row, { onConflict: "session_id" });
  if (errScore)
    return new Response("Gagal menyimpan nilai: " + errScore.message, {
      status: 500,
    });

  await supabase
    .from("sessions")
    .update({ status: "selesai", selesai_at: new Date().toISOString() })
    .eq("id", sessionId);

  return Response.json({ ok: true, skor: row.skor });
}
