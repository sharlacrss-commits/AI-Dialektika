import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sumopodChat,
  bacaPemakaian,
  type ChatMessage,
  type BagianIsi,
  type Pemakaian,
} from "@/lib/sumopod";
import { catatPanggilanAI, lewatBatasLaju } from "@/lib/ai-log";
import { SYSTEM_DISKUSI, kickoffPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

// Berapa lampiran terakhir yang ikut dikirim ulang ke AI setiap giliran.
// Perlu >1 supaya diskusi lanjutan ("nah bagian nomor 2 itu gimana?") masih
// punya konteks gambarnya. Sengaja dibatasi karena tiap file menambah token,
// menambah waktu tunggu, dan bisa menembus batas 60 detik di Vercel.
const MAKS_LAMPIRAN_KONTEKS = 2;

type Lampiran = { path: string; nama: string; tipe: string };

export async function POST(req: NextRequest) {
  const { sessionId, pesan, kickoff, lampiran } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Belum masuk", { status: 401 });

  // Empat pengambilan data berikut tidak saling bergantung — semuanya hanya
  // butuh user.id dan sessionId. Dulu dijalankan berurutan, dan tiap giliran
  // menambah satu perjalanan bolak-balik ke Supabase sebelum AI sempat
  // dipanggil. Dijalankan bersamaan, ongkosnya tinggal sepanjang yang paling
  // lambat saja. Urutan PEMERIKSAANNYA di bawah sengaja dijaga tetap sama.
  const [lewatBatas, hasilSesi, hasilRiwayat, hasilSetting] = await Promise.all([
    lewatBatasLaju(user.id),
    supabase
      .from("sessions")
      .select("id, mapel, topik, status")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("messages")
      .select("peran, isi, lampiran_path, lampiran_nama, lampiran_tipe")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("app_settings")
      .select("chat_model, fallback_model")
      .eq("id", "global")
      .single(),
  ]);

  // Rem biaya. Tanpa ini satu siswa (atau satu skrip iseng) bisa
  // menghabiskan saldo Sumopod untuk seluruh penelitian dalam beberapa menit.
  if (lewatBatas) {
    return new Response(
      "Terlalu cepat mengirim pesan. Tunggu sebentar ya, lalu coba lagi.",
      { status: 429 },
    );
  }

  // Pastikan sesi milik user
  const sesi = hasilSesi.data;
  if (!sesi) return new Response("Sesi tidak ditemukan", { status: 404 });
  if (sesi.status === "selesai")
    return new Response("Sesi sudah selesai", { status: 400 });

  // Lampiran wajib berada di folder milik user dan sesi ini. Tanpa
  // pemeriksaan ini, seseorang bisa menyuruh server membacakan file milik
  // siswa lain hanya dengan menebak path-nya.
  const berkas: Lampiran | null =
    lampiran?.path && lampiran?.nama
      ? {
          path: String(lampiran.path),
          nama: String(lampiran.nama),
          tipe: String(lampiran.tipe ?? "application/octet-stream"),
        }
      : null;
  if (berkas && !berkas.path.startsWith(`${user.id}/${sessionId}/`))
    return new Response("Lampiran tidak sah", { status: 403 });

  // Riwayat percakapan (sudah diambil bersamaan di atas)
  const lalu = hasilRiwayat.data ?? [];

  // Ambil isi file dari Storage lalu ubah jadi data URL. Dibaca dengan klien
  // admin karena bucket-nya privat dan kepemilikan sudah diperiksa di atas.
  const gudang = createAdminClient();
  async function dataUrl(path: string, tipe: string) {
    const { data, error } = await gudang.storage.from("lampiran").download(path);
    if (error || !data) {
      console.error("[chat] gagal baca lampiran:", path, error?.message);
      return null;
    }
    const b64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    return `data:${tipe};base64,${b64}`;
  }

  // Hanya beberapa lampiran terakhir yang benar-benar dikirim ulang; sisanya
  // cukup disebut sebagai teks supaya AI tahu file itu pernah ada.
  const indeksBerlampiran = lalu
    .map((m, i) => (m.lampiran_path ? i : -1))
    .filter((i) => i >= 0);
  const dikirimUlang = new Set(
    indeksBerlampiran.slice(-(MAKS_LAMPIRAN_KONTEKS - (berkas ? 1 : 0))),
  );

  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_DISKUSI }];
  for (const [i, m] of lalu.entries()) {
    const peran = m.peran === "user" ? "user" : "assistant";
    if (!m.lampiran_path) {
      messages.push({ role: peran, content: m.isi });
      continue;
    }
    const label = `[siswa melampirkan file: ${m.lampiran_nama}]`;
    const url = dikirimUlang.has(i)
      ? await dataUrl(m.lampiran_path, m.lampiran_tipe ?? "image/png")
      : null;
    if (url) {
      messages.push({
        role: peran,
        content: [
          { type: "text", text: m.isi || label },
          { type: "image_url", image_url: { url } },
        ] satisfies BagianIsi[],
      });
    } else {
      messages.push({ role: peran, content: `${m.isi}\n${label}`.trim() });
    }
  }

  if (kickoff) {
    messages.push({
      role: "user",
      content: kickoffPrompt(sesi.mapel, sesi.topik),
    });
  } else {
    // Boleh mengirim file tanpa menulis apa pun.
    if ((!pesan || !pesan.trim()) && !berkas)
      return new Response("Pesan kosong", { status: 400 });

    const teks = (pesan ?? "").trim();
    await supabase.from("messages").insert({
      session_id: sessionId,
      peran: "user",
      isi: teks,
      lampiran_path: berkas?.path ?? null,
      lampiran_nama: berkas?.nama ?? null,
      lampiran_tipe: berkas?.tipe ?? null,
    });

    if (berkas) {
      const url = await dataUrl(berkas.path, berkas.tipe);
      messages.push(
        url
          ? {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    teks ||
                    "Aku melampirkan ini. Bagian mananya ya yang perlu aku pahami dulu?",
                },
                { type: "image_url", image_url: { url } },
              ] satisfies BagianIsi[],
            }
          : {
              role: "user",
              content:
                `${teks}\n[file "${berkas.nama}" gagal dibaca sistem]`.trim(),
            },
      );
    } else {
      messages.push({ role: "user", content: teks });
    }
  }

  const setting = hasilSetting.data;
  const models = setting
    ? [setting.chat_model, setting.fallback_model]
    : undefined;

  const jumlahLampiran = indeksBerlampiran.length + (berkas ? 1 : 0);
  const mulai = Date.now();
  const {
    res: aiRes,
    model,
    modelDiminta,
    pakaiFallback,
  } = await sumopodChat({
    messages,
    stream: true,
    models,
    // Siswa menunggu di depan layar, jadi chat mengejar responsif. Diukur 21
    // Agustus 2026: tanpa merenung, huruf pertama muncul 1,1 detik (dari 4,9
    // detik) dan mutu pertanyaan Sokratiknya setara. Penilaian akhir sesi di
    // /api/nilai SENGAJA tidak diberi batasan ini — di sana model boleh
    // merenung penuh karena hasilnya menjadi data penelitian.
    //
    // Kalau ternyata jawaban terasa kurang menggali, naikkan ke "low"
    // (terukur 2,6 detik) sebelum mengembalikannya ke bawaan.
    reasoning_effort: "none",
  });

  if (!aiRes.ok || !aiRes.body) {
    const detail = await aiRes.text().catch(() => "");
    console.error("[chat] Sumopod gagal:", aiRes.status, detail.slice(0, 500));
    await catatPanggilanAI({
      userId: user.id,
      sessionId,
      jenis: "chat",
      modelDiminta,
      model,
      pakaiFallback,
      status: "error",
      httpStatus: aiRes.status,
      ttfbMs: null,
      latensiMs: Date.now() - mulai,
      jumlahLampiran,
      pesanError: detail,
    });
    return new Response("AI tidak merespons. " + detail, {
      // Teruskan status aslinya supaya penyebabnya bisa dibedakan:
      // 401 = API key salah, 402 = saldo habis, 429 = kena limit.
      status: aiRes.status >= 400 ? aiRes.status : 502,
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = aiRes.body.getReader();
  const uid = user.id;
  let full = "";
  let buffer = "";
  let ttfb: number | null = null;
  let pemakaian: Pemakaian | null = null;

  // Simpan jawaban AI ke DB. Dipanggil saat stream selesai normal MAUPUN
  // saat putus di tengah, supaya jawaban yang sudah terkirim ke layar
  // tidak hilang begitu halaman di-refresh.
  //
  // WAJIB pakai klien admin, bukan `supabase` di atas. Klien itu membaca
  // token login dari cookie, sedangkan insert ini terjadi SETELAH respons
  // mulai mengalir — pada titik itu Next.js sudah menutup akses cookie,
  // sehingga permintaan terkirim tanpa identitas dan ditolak RLS. Sejak
  // supabase/004-tambal-keamanan.sql siswa memang tidak boleh menulis
  // pesan berperan 'assistant', jadi jalur admin ini satu-satunya yang sah.
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : supabase;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.warn(
      "[chat] SUPABASE_SERVICE_ROLE_KEY kosong — jawaban AI TIDAK akan tersimpan.",
    );

  let sudahDitutup = false;
  async function tutupPembukuan() {
    if (sudahDitutup) return;
    sudahDitutup = true;

    if (full.trim()) {
      const { error } = await db.from("messages").insert({
        session_id: sessionId,
        peran: "assistant",
        isi: full,
        is_pemantik: full.includes("?"),
      });
      if (error) console.error("[chat] gagal simpan jawaban:", error.message);
    }

    await catatPanggilanAI({
      userId: uid,
      sessionId,
      jenis: "chat",
      modelDiminta,
      model,
      pakaiFallback,
      status: full.trim() ? "ok" : "error",
      httpStatus: aiRes.status,
      ttfbMs: ttfb,
      latensiMs: Date.now() - mulai,
      pemakaian,
      jumlahLampiran,
      pesanError: full.trim() ? null : "stream berakhir tanpa isi",
    });
  }

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        await tutupPembukuan();
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
        // "[DONE]" adalah penanda selesai resmi SSE gaya OpenAI. WAJIB
        // langsung ditutup di sini, jangan cuma di-skip: kalau menunggu
        // koneksi hulu tertutup sendiri, permintaan menggantung sampai
        // browser memutusnya (terukur 106 detik untuk balasan 3 detik).
        // Selama menggantung, kolom chat siswa terkunci dan di Vercel
        // permintaan akan mati kena batas maxDuration 60 detik.
        if (data === "[DONE]") {
          await tutupPembukuan();
          controller.close();
          return;
        }
        try {
          const json = JSON.parse(data);
          if (json.error) {
            // Sumopod bisa mengirim error di tengah stream (mis. kuota habis/limit)
            console.error("[chat] error di tengah stream:", json.error);
            await tutupPembukuan();
            controller.close();
            return;
          }
          // Chunk paling akhir membawa jumlah token dan tidak punya delta.
          pemakaian = bacaPemakaian(json) ?? pemakaian;
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            // Waktu tunggu yang benar-benar dirasakan siswa: sampai huruf
            // pertama muncul, bukan sampai jawaban selesai.
            if (ttfb === null) ttfb = Date.now() - mulai;
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          // potongan JSON belum lengkap, abaikan
        }
      }
    },
    async cancel() {
      // Siswa menutup/berpindah halaman di tengah jawaban.
      await tutupPembukuan();
      await reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
