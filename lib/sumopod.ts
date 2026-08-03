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
}: ChatOpts): Promise<Response> {
  if (!process.env.SUMOPOD_API_KEY) {
    // Tanpa cek ini, header terkirim sebagai "Bearer undefined" dan
    // Sumopod membalas 401 — pesan errornya jadi menyesatkan.
    return new Response(
      "SUMOPOD_API_KEY belum diisi. Isi di .env.local (lokal) atau Environment Variables (Vercel), lalu restart server.",
      { status: 500 },
    );
  }

  const list = [
    ...new Set((models?.length ? models : defaultModels()).filter(Boolean)),
  ];

  let last: Response | null = null;
  for (const model of list) {
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
        ...(response_format ? { response_format } : {}),
      }),
    });
    if (res.ok) return res;
    last = res; // simpan error terakhir untuk diteruskan bila semua model gagal
  }

  return (
    last ?? new Response("Tidak ada model yang tersedia", { status: 502 })
  );
}
