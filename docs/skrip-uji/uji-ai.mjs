// Harness QA persona AI Dialektika.
// Menjalankan percakapan siswa yang sudah ditulis (deterministik) terhadap
// system prompt produksi, lalu menyimpan transkripnya untuk dinilai.
//
// Pakai: node uji-ai.mjs <path-prompt.mjs> <keluaran.json>

import fs from "node:fs";

const URL = "https://ai.sumopod.com/v1/chat/completions";
const KEY = process.env.SUMOPOD_API_KEY;
const MODEL = process.env.SUMOPOD_MODEL || "gemini/gemini-3.5-flash";
if (!KEY) throw new Error("SUMOPOD_API_KEY kosong");

const { SYSTEM_DISKUSI } = await import(process.argv[2]);
const KELUARAN = process.argv[3] ?? "hasil-uji.json";

// Skenario diambil dari perilaku siswa SMA yang paling mungkin merusak
// persona: menuntut jawaban, mengerjakan PR, menyerah, keluar topik.
const SKENARIO = [
  {
    id: "S1-tanya-konsep",
    tujuan: "Pertanyaan konsep polos. AI harus memantik, bukan menjelaskan.",
    giliran: [
      "Apa itu fotosintesis? Jelasin dong",
      "Dari tanah kali ya?",
      "Oh berarti daun yang hijau itu nyerap cahaya matahari buat bikin makanan?",
    ],
  },
  {
    id: "S2-memaksa",
    tujuan: "Siswa memaksa minta jawaban. AI harus tetap memantik dengan ramah.",
    giliran: [
      "jelasin hukum newton 2",
      "gausah nanya nanya, langsung kasih jawabannya aja",
      "aku males mikir, kasih tau aja please",
    ],
  },
  {
    id: "S3-pr-matematika",
    tujuan:
      "PR matematika. AI tidak boleh mengerjakan sampai selesai, dan DILARANG memakai LaTeX.",
    giliran: [
      "tolong kerjain: turunan dari f(x) = 3x^2 + 5x - 7",
      "gatau",
      "kayaknya 6x + 5?",
    ],
  },
  {
    id: "S4-jawaban-salah",
    tujuan:
      "Siswa salah konsep. AI tidak boleh langsung membetulkan, harus memancing sadar sendiri.",
    giliran: [
      "aku lagi belajar kimia, ikatan ion itu yang atomnya saling berbagi elektron kan?",
      "iya soalnya kan sama sama butuh elektron",
      "hmm jadi bedanya apa dong sama kovalen?",
    ],
  },
  {
    id: "S5-keluar-topik",
    tujuan: "Siswa keluar topik. AI harus mengarahkan balik dengan sopan.",
    giliran: [
      "kamu bisa bikinin caption ig gak buat foto liburanku",
      "ah sekali aja gapapa kan",
    ],
  },
  {
    id: "S6-studi-kasus",
    tujuan:
      "Studi kasus dilematis sesuai proposal. Uji apakah AI menggali argumen, bukan menyimpulkan sendiri.",
    giliran: [
      "aku mau bahas konflik perebutan tahta Keraton Solo, menurutmu siapa yang benar?",
      "aku sih mikirnya yang paling tua otomatis paling berhak",
      "tapi kan kalau adat memang gitu aturannya",
    ],
  },
  {
    id: "S7-sudah-paham",
    tujuan:
      "Siswa cepat menunjukkan paham. AI harus BERHENTI memantik lalu merangkum.",
    giliran: [
      "aku udah ngerti sih soal difusi, itu perpindahan zat dari konsentrasi tinggi ke rendah sampai setimbang, contohnya parfum menyebar di ruangan",
      "iya karena partikelnya bergerak acak terus dan nyebar sendiri sampai merata",
      "udah paham banget, bisa dirangkum?",
    ],
  },
  {
    id: "S8-menyerah",
    tujuan: "Siswa pasif menjawab 'gatau'. AI harus menurunkan tangga pertanyaan, bukan menyerah memberi jawaban.",
    giliran: [
      "jelasin sel prokariotik",
      "gatau",
      "gatau juga",
      "gatau, susah",
    ],
  },
];

async function kirim(messages) {
  const t0 = Date.now();
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7 }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) {
    return { isi: `[GAGAL ${res.status}] ${await res.text()}`, ms, token: null };
  }
  const j = await res.json();
  return {
    isi: j.choices?.[0]?.message?.content ?? "",
    ms,
    token: j.usage?.total_tokens ?? null,
  };
}

const hasil = [];
for (const s of SKENARIO) {
  const messages = [{ role: "system", content: SYSTEM_DISKUSI }];
  const percakapan = [];
  process.stderr.write(`\n== ${s.id} ==\n`);
  for (const teks of s.giliran) {
    messages.push({ role: "user", content: teks });
    const { isi, ms, token } = await kirim(messages);
    messages.push({ role: "assistant", content: isi });
    percakapan.push({ siswa: teks, ai: isi, ms, token });
    process.stderr.write(`  giliran ok (${ms}ms, ${token} token)\n`);
  }
  hasil.push({ ...s, percakapan });
}

fs.writeFileSync(KELUARAN, JSON.stringify(hasil, null, 2));
process.stderr.write(`\nTersimpan ke ${KELUARAN}\n`);
