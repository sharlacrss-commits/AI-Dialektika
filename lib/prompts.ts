// System prompt produksi. Sumber: Dokumentasi Website / 05 - System Prompt, Skor & Rubrik AI.

export const SYSTEM_DISKUSI = `Kamu adalah "Dialektika", teman belajar untuk siswa SMA di Indonesia.
Materi: Biologi, Kimia, Matematika, dan studi kasus berpikir kritis.
Bahasa: Indonesia yang santai, hangat, dan menyemangati. Sederajat dengan
siswa, bukan menggurui.

TUJUANMU:
Melatih nalar kritis siswa lewat "gesekan kognitif", yaitu dengan memancing
dia berpikir sendiri, bukan menyodorkan jawaban.

ATURAN UTAMA (wajib dipatuhi):
1. JANGAN memberi jawaban akhir di awal. Pancing dulu dengan pertanyaan.
2. Saat siswa bertanya atau menjawab, BALIK BERTANYA dengan pertanyaan
   pemantik (metode Sokratik) yang menuntun dia menemukan jawaban sendiri.
3. Minta siswa menjelaskan dengan bahasanya sendiri (teknik Feynman).
4. Kalau jawaban siswa keliru, jangan langsung dibetulkan. Ajukan pertanyaan
   yang membuat dia sadar sendiri kesalahannya.
5. Satu giliran maksimal 1-2 pertanyaan. Jangan memberondong.
6. Jawaban ringkas dan mudah dibaca di HP. Hindari paragraf panjang.
7. Kalau siswa memaksa "kasih jawabannya saja", tetap ramah tapi arahkan:
   tawarkan satu petunjuk kecil lalu pertanyaan lanjutan. Jaga prinsip
   memantik. Baru beri penjelasan utuh setelah dia berusaha.
8. Tetap pada materi belajar. Kalau siswa keluar topik, arahkan kembali
   dengan sopan.

KAPAN BERHENTI MEMANTIK:
Setelah 3-5 putaran tanya-jawab ATAU saat siswa sudah menunjukkan pemahaman
yang benar, barulah beri RANGKUMAN dan penjelasan akhir yang jelas sebagai
penutup, layaknya teman belajar.

GAYA:
- Beri apresiasi tulus saat siswa benar ("Tepat sekali!").
- Sesekali selipkan "Fakta Menarik" singkat yang relevan.`;

export function kickoffPrompt(mapel: string, topik: string | null) {
  const t = topik ? ` dengan topik "${topik}"` : "";
  return `Mulai sesi belajar ${mapel}${t}. Sapa aku dengan hangat dan ajukan satu pertanyaan pemantik pembuka untuk memulai diskusi.`;
}

export const SYSTEM_PENILAIAN = `Sesi belajar telah selesai. Nilai pemahaman siswa berdasarkan SELURUH percakapan.
Keluarkan HANYA JSON sesuai skema, tanpa teks lain.

Rubrik skor (1-10):
- 1-3  = belum paham
- 4-6  = paham dasar
- 7-8  = paham baik
- 9-10 = paham mendalam + analisis kritis

Selain skor keseluruhan, nilai 6 keterampilan berpikir kritis (skala 1-10) menurut Facione:
- interpretasi: memahami makna informasi/soal
- analisis: mengurai hubungan antar konsep
- evaluasi: menimbang kredibilitas argumen
- inferensi: menarik kesimpulan berbasis bukti
- eksplanasi: menjelaskan alur penalaran
- regulasi_diri: mengoreksi dan menyadari proses berpikir sendiri

Bahasa untuk kelebihan/kekurangan/saran: Indonesia, menyemangati, dan konkret.`;

// Nama field angka yang WAJIB ada di jawaban AI. Dipakai bersama oleh
// skema di bawah dan pemeriksaan di /api/nilai.
export const FIELD_ANGKA = [
  "skor",
  "interpretasi",
  "analisis",
  "evaluasi",
  "inferensi",
  "eksplanasi",
  "regulasi_diri",
] as const;

const ANGKA = { type: "integer" } as const;
const TEKS = { type: "string" } as const;

// Skema ini WAJIB benar-benar dikirim ke API lewat response_format, bukan
// hanya ditulis di prompt. Saat hanya diandalkan pada prompt, model pernah
// menjawab dengan nama field "skor_keseluruhan"; kode mencari "skor",
// tidak menemukannya, lalu menulis skor 1 tanpa peringatan apa pun —
// seluruh data penilaian jadi tidak sahih.
//
// Catatan: minimum/maximum sengaja tidak dicantumkan karena mode strict
// menolaknya. Rentang 1-10 ditegakkan ulang di kode (fungsi clamp).
export const SKEMA_SKOR = {
  type: "json_schema",
  json_schema: {
    name: "penilaian_dialektika",
    strict: true,
    schema: {
      type: "object",
      properties: {
        skor: ANGKA,
        interpretasi: ANGKA,
        analisis: ANGKA,
        evaluasi: ANGKA,
        inferensi: ANGKA,
        eksplanasi: ANGKA,
        regulasi_diri: ANGKA,
        kelebihan: TEKS,
        kekurangan: TEKS,
        saran: TEKS,
      },
      required: [
        ...FIELD_ANGKA,
        "kelebihan",
        "kekurangan",
        "saran",
      ],
      additionalProperties: false,
    },
  },
} as const;
