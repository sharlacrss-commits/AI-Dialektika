// Klien Sumopod (API kompatibel OpenAI).
// Base URL Sumopod: https://ai.sumopod.com  ->  endpoint chat: /v1/chat/completions
const SUMOPOD_URL = "https://ai.sumopod.com/v1/chat/completions";

// Diverifikasi ada di katalog Sumopod per 28 Juli 2026.
// Katalog Sumopod berubah cukup sering — kalau chatbot tiba-tiba diam,
// cek dulu daftar model terbaru di https://ai.sumopod.com/v1/models
const DEFAULT_UTAMA = "gemini/gemini-3.5-flash";
const DEFAULT_CADANGAN = "gpt-4o-mini";

// Dibaca saat request (bukan saat module load) supaya selalu ikut env terbaru.
export function defaultModels() {
  return [
    process.env.SUMOPOD_MODEL || DEFAULT_UTAMA,
    process.env.SUMOPOD_MODEL_FALLBACK || DEFAULT_CADANGAN,
  ];
}

// Isi pesan bisa berupa teks biasa, atau gabungan teks + file (gambar/PDF)
// saat siswa melampirkan sesuatu. Format multimodal ini mengikuti gaya
// OpenAI; Sumopod menerimanya apa adanya, sudah diuji untuk PNG dan PDF.
export type BagianIsi =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | BagianIsi[];
};

// Alias kompatibilitas untuk kode lama yang masih memakai nama ORMessage.
export type ORMessage = ChatMessage;

type ChatOpts = {
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  response_format?: unknown;
  models?: string[];
};

// Selain Response, pemanggil butuh tahu model mana yang AKHIRNYA menjawab
// dan berapa lama menunggunya — keduanya dicatat ke tabel ai_calls dan
// ditampilkan di /admin/ai.
export type HasilSumopod = {
  res: Response;
  modelDiminta: string;
  model: string | null; // null kalau semua model gagal
  pakaiFallback: boolean;
  // Jeda sampai HEADER respons diterima. Untuk permintaan streaming ini
  // bukan waktu jawaban selesai — itu diukur oleh pemanggil.
  latensiHeaderMs: number;
};

export type Pemakaian = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

// Sumopod (OpenAI-compatible) hanya menerima SATU "model" per request,
// tidak ada fitur multi-model + route:"fallback" seperti OpenRouter.
// Maka fallback kita lakukan manual: coba model pertama; kalau responsnya
// gagal (bukan .ok), lanjut coba model berikutnya.
export async function sumopodChat({
  messages,
  stream = false,
  temperature = 0.7,
  response_format,
  models,
}: ChatOpts): Promise<HasilSumopod> {
  const list = [
    ...new Set((models?.length ? models : defaultModels()).filter(Boolean)),
  ];
  const diminta = list[0] ?? "(tidak ada model)";

  if (!process.env.SUMOPOD_API_KEY) {
    // Tanpa cek ini, header terkirim sebagai "Bearer undefined" dan
    // Sumopod membalas 401 — pesan errornya jadi menyesatkan.
    return {
      res: new Response(
        "SUMOPOD_API_KEY belum diisi. Isi di .env.local (lokal) atau Environment Variables (Vercel), lalu restart server.",
        { status: 500 },
      ),
      modelDiminta: diminta,
      model: null,
      pakaiFallback: false,
      latensiHeaderMs: 0,
    };
  }

  const mulai = Date.now();
  let last: Response | null = null;

  for (const [i, model] of list.entries()) {
    const res = await fetch(SUMOPOD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUMOPOD_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        stream,
        // Tanpa ini respons streaming TIDAK pernah menyertakan jumlah token,
        // sehingga pemakaian & biaya tidak bisa dipantau. Sudah diuji ke
        // Sumopod: blok "usage" dikirim di chunk terakhir sebelum [DONE].
        ...(stream ? { stream_options: { include_usage: true } } : {}),
        ...(response_format ? { response_format } : {}),
      }),
    });
    if (res.ok) {
      return {
        res,
        modelDiminta: diminta,
        model,
        pakaiFallback: i > 0,
        latensiHeaderMs: Date.now() - mulai,
      };
    }
    last = res; // simpan error terakhir untuk diteruskan bila semua model gagal
  }

  return {
    res: last ?? new Response("Tidak ada model yang tersedia", { status: 502 }),
    modelDiminta: diminta,
    model: null,
    pakaiFallback: list.length > 1,
    latensiHeaderMs: Date.now() - mulai,
  };
}

// Ambil blok "usage" dari satu potongan JSON SSE, kalau ada.
export function bacaPemakaian(json: unknown): Pemakaian | null {
  const u = (json as { usage?: Pemakaian } | null)?.usage;
  return u && typeof u === "object" ? u : null;
}
