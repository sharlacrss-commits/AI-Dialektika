import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sumopodChat, bacaPemakaian, type ChatMessage } from "@/lib/sumopod";
import { catatPanggilanAI } from "@/lib/ai-log";
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
    .select("id, mapel, topik, user_id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();
  if (!sesi) return new Response("Sesi tidak ditemukan", { status: 404 });
  if (sesi.status === "selesai")
    return new Response("Sesi ini sudah dinilai.", { status: 400 });

  const { data: pesan } = await supabase
    .from("messages")
    .select("peran, isi, lampiran_nama")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  // Sesi tanpa jawaban siswa tidak layak dinilai. Tanpa penjagaan ini,
  // siswa bisa membuka sesi lalu langsung menekan "Akhiri & Nilai", dan
  // model tetap mengarang angka — data penelitian jadi kotor.
  const jawabanSiswa = (pesan ?? []).filter(
    (m) => m.peran === "user" && m.isi.trim().length > 0,
  );
  if (jawabanSiswa.length < 2) {
    return new Response(
      "Diskusinya masih terlalu singkat untuk dinilai. Jawab dulu minimal 2 pertanyaan dari Dialektika ya.",
      { status: 400 },
    );
  }

  // Lampiran ikut dicatat di transkrip. Tanpa ini penilai tidak tahu bahwa
  // sebagian konteks (soal, atau bahkan hasil kerja siswa) ada di dalam file,
  // lalu menilai seolah siswa berbicara tanpa dasar — skornya jadi lebih
  // rendah dari kemampuan sebenarnya.
  const transkrip = (pesan ?? [])
    .map((m) => {
      const siapa = m.peran === "user" ? "Siswa" : "Dialektika";
      const lampiran = m.lampiran_nama
        ? ` [melampirkan file: ${m.lampiran_nama}]`
        : "";
      return `${siapa}: ${m.isi}${lampiran}`;
    })
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

  const mulai = Date.now();
  const {
    res: aiRes,
    model,
    modelDiminta,
    pakaiFallback,
  } = await sumopodChat({
    messages,
    temperature: 0.3,
    models,
    response_format: SKEMA_SKOR,
  });

  // Semua jalur keluar mencatat performanya, supaya halaman /admin/ai
  // memperlihatkan tingkat kegagalan penilaian apa adanya.
  const catat = (
    status: "ok" | "error",
    extra: { pemakaian?: ReturnType<typeof bacaPemakaian>; pesanError?: string } = {},
  ) =>
    catatPanggilanAI({
      userId: user.id,
      sessionId,
      jenis: "nilai",
      modelDiminta,
      model,
      pakaiFallback,
      status,
      httpStatus: aiRes.status,
      ttfbMs: null,
      latensiMs: Date.now() - mulai,
      pemakaian: extra.pemakaian ?? null,
      pesanError: extra.pesanError ?? null,
    });

  if (!aiRes.ok) {
    const d = await aiRes.text().catch(() => "");
    await catat("error", { pesanError: d });
    return new Response("AI gagal menilai. " + d, { status: 502 });
  }
  const data = await aiRes.json();
  const pemakaian = bacaPemakaian(data);
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
  if (!parsed) {
    await catat("error", { pemakaian, pesanError: "JSON tidak terbaca: " + text.slice(0, 200) });
    return new Response("Format nilai tidak terbaca", { status: 502 });
  }

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
    await catat("error", {
      pemakaian,
      pesanError: "field hilang: " + hilang.join(", "),
    });
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

  // WAJIB klien service-role. Sejak supabase/004-tambal-keamanan.sql siswa
  // tidak lagi boleh menulis ke `scores` maupun mengubah status sesi —
  // kalau tidak, siapa pun bisa mengarang skor 10 langsung dari browser
  // dan seluruh data penelitian jadi tidak sahih.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await catat("error", { pemakaian, pesanError: "service role key kosong" });
    return new Response(
      "SUPABASE_SERVICE_ROLE_KEY belum diisi, nilai tidak bisa disimpan. Hubungi admin.",
      { status: 500 },
    );
  }
  const db = createAdminClient();

  const { error: errScore } = await db
    .from("scores")
    .upsert(row, { onConflict: "session_id" });
  if (errScore) {
    await catat("error", { pemakaian, pesanError: errScore.message });
    return new Response("Gagal menyimpan nilai: " + errScore.message, {
      status: 500,
    });
  }

  await db
    .from("sessions")
    .update({ status: "selesai", selesai_at: new Date().toISOString() })
    .eq("id", sessionId);

  await catat("ok", { pemakaian });
  return Response.json({ ok: true, skor: row.skor });
}
