import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openrouterChat, type ORMessage } from "@/lib/openrouter";
import { SYSTEM_DISKUSI, kickoffPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { sessionId, pesan, kickoff } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Belum masuk", { status: 401 });

  // Pastikan sesi milik user
  const { data: sesi } = await supabase
    .from("sessions")
    .select("id, mapel, topik, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!sesi) return new Response("Sesi tidak ditemukan", { status: 404 });
  if (sesi.status === "selesai")
    return new Response("Sesi sudah selesai", { status: 400 });

  // Riwayat percakapan
  const { data: history } = await supabase
    .from("messages")
    .select("peran, isi")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const messages: ORMessage[] = [{ role: "system", content: SYSTEM_DISKUSI }];
  for (const m of history ?? []) {
    messages.push({
      role: m.peran === "user" ? "user" : "assistant",
      content: m.isi,
    });
  }

  if (kickoff) {
    messages.push({ role: "user", content: kickoffPrompt(sesi.mapel, sesi.topik) });
  } else {
    if (!pesan || !pesan.trim())
      return new Response("Pesan kosong", { status: 400 });
    await supabase
      .from("messages")
      .insert({ session_id: sessionId, peran: "user", isi: pesan });
    messages.push({ role: "user", content: pesan });
  }

  const { data: setting } = await supabase
    .from("app_settings")
    .select("chat_model, fallback_model")
    .eq("id", "global")
    .single();
  const models = setting
    ? [setting.chat_model, setting.fallback_model]
    : undefined;

  const orRes = await openrouterChat({ messages, stream: true, models });
  if (!orRes.ok || !orRes.body) {
    const detail = await orRes.text().catch(() => "");
    return new Response("AI tidak merespons. " + detail, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = orRes.body.getReader();
  let full = "";
  let buffer = "";

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        if (full.trim()) {
          await supabase.from("messages").insert({
            session_id: sessionId,
            peran: "assistant",
            isi: full,
            is_pemantik: full.includes("?"),
          });
        }
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          if (json.error) {
            // OpenRouter mengirim error di tengah stream (mis. model habis/limit)
            controller.close();
            return;
          }
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          // potongan JSON belum lengkap, abaikan
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
