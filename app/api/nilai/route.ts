import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sumopodChat, type ChatMessage } from "@/lib/sumopod";
import { SYSTEM_PENILAIAN } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const clamp = (n: unknown) =>
  Math.min(10, Math.max(1, Math.round(Number(n) || 1)));

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

  const aiRes = await sumopodChat({ messages, temperature: 0.3, models });
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
