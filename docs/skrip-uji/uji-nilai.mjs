// QA mode penilaian: apakah skor AI bisa MEMBEDAKAN kualitas siswa?
// Kalau tiga transkrip yang jelas berbeda mutunya mendapat skor mirip,
// data penelitian (uji-t) tidak akan menunjukkan apa-apa.

import fs from "node:fs";

const URL = "https://ai.sumopod.com/v1/chat/completions";
const KEY = process.env.SUMOPOD_API_KEY;
const MODEL = process.env.SUMOPOD_MODEL || "gemini/gemini-3.5-flash";

const { SYSTEM_PENILAIAN, SKEMA_SKOR } = await import(process.argv[2]);
const ULANG = Number(process.argv[3] ?? 3); // uji konsistensi: nilai berkali-kali

const KASUS = [
  {
    id: "A-kuat",
    harapan: "tinggi (8-10)",
    mapel: "Biologi",
    transkrip: `Dialektika: Menurutmu dari mana tumbuhan mendapat bahan untuk tumbuh?
Siswa: Awalnya aku kira dari tanah, tapi kalau cuma dari tanah harusnya tanah di pot berkurang banyak, padahal enggak. Jadi kayaknya sebagian besar justru dari udara, dari karbon dioksida.
Dialektika: Menarik. Apa dasarnya?
Siswa: Karena massa kayu itu sebagian besar karbon, dan satu-satunya sumber karbon di sekitar tumbuhan ya CO2 di udara. Air dari tanah perannya sebagai sumber hidrogen dan elektron, bukan penyusun massa utama.
Dialektika: Bagaimana peran cahaya?
Siswa: Cahaya bukan bahan, tapi energi. Klorofil menangkapnya untuk memecah air jadi hidrogen dan oksigen. Oksigen dibuang, hidrogennya dipakai mengikat CO2 jadi glukosa. Jadi kalau ditanya "makanan dari mana", jawabannya: karbonnya dari udara, energinya dari matahari.
Dialektika: Tadi kamu sempat menduga dari tanah, kenapa berubah?
Siswa: Karena dugaan awalku nggak lolos uji sederhana tadi, massa tanahnya nggak berkurang. Jadi asumsiku yang salah, bukan datanya.`,
  },
  {
    id: "B-malas",
    harapan: "rendah (1-4)",
    mapel: "Biologi",
    transkrip: `Dialektika: Menurutmu dari mana tumbuhan mendapat bahan untuk tumbuh?
Siswa: gatau
Dialektika: Coba tebak saja, dari tanah atau dari udara?
Siswa: tanah
Dialektika: Kenapa menurutmu dari tanah?
Siswa: gatau ya gitu aja
Dialektika: Apa peran cahaya matahari?
Siswa: penting
Dialektika: Pentingnya bagaimana?
Siswa: udah ah cape, kasih jawabannya aja`,
  },
  {
    id: "C-salah-pede",
    harapan: "menengah-bawah (3-5)",
    mapel: "Biologi",
    transkrip: `Dialektika: Menurutmu dari mana tumbuhan mendapat bahan untuk tumbuh?
Siswa: Jelas dari tanah. Tanah kan mengandung pupuk dan mineral, itu makanannya tumbuhan. Makanya kalau tanahnya subur tumbuhannya besar.
Dialektika: Kalau begitu, kenapa tumbuhan tetap butuh cahaya?
Siswa: Cahaya buat menghangatkan aja biar nggak mati kedinginan. Yang bikin tumbuh tetap pupuk di tanah.
Dialektika: Apa yang terjadi kalau tumbuhan ditaruh di tempat gelap tapi tanahnya subur?
Siswa: Ya tetap tumbuh dong, kan makanannya ada. Paling agak dingin.
Dialektika: Kamu yakin?
Siswa: Yakin banget, udah jelas itu.`,
  },
  {
    id: "D-sedang",
    harapan: "menengah (5-7)",
    mapel: "Biologi",
    transkrip: `Dialektika: Menurutmu dari mana tumbuhan mendapat bahan untuk tumbuh?
Siswa: Dari tanah sama dari matahari kayaknya. Air sama mineral dari tanah, terus matahari buat energi.
Dialektika: Apa peran matahari lebih tepatnya?
Siswa: Buat fotosintesis. Jadi cahaya diserap klorofil terus diubah jadi makanan.
Dialektika: Makanan itu tersusun dari apa?
Siswa: Hmm, glukosa ya? Aku inget rumusnya ada C6H12O6. Berarti ada karbonnya.
Dialektika: Karbonnya datang dari mana?
Siswa: Oh iya, dari CO2 kali ya, soalnya tumbuhan kan nyerap CO2. Tapi aku kurang yakin sih.
Dialektika: Jadi apakah tanah tetap sumber utama massa tumbuhan?
Siswa: Kayaknya enggak sepenuhnya. Tapi aku belum bisa jelasin kenapa.`,
  },
  {
    id: "E-baik",
    harapan: "baik (7-8)",
    mapel: "Biologi",
    transkrip: `Dialektika: Menurutmu dari mana tumbuhan mendapat bahan untuk tumbuh?
Siswa: Sebagian dari tanah berupa air dan mineral, tapi bahan utama penyusun tubuhnya dari CO2 di udara.
Dialektika: Apa dasarnya?
Siswa: Karena glukosa itu C6H12O6, karbonnya banyak. Dan karbon nggak diserap akar, tumbuhan ambilnya dari udara lewat stomata.
Dialektika: Peran cahaya?
Siswa: Sumber energi buat reaksinya. Tanpa cahaya reaksinya nggak jalan walaupun bahannya ada.
Dialektika: Apa yang belum kamu yakini?
Siswa: Aku belum paham detail reaksi terangnya, cuma tahu garis besarnya aja.`,
  },
];

async function nilai(k) {
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: SKEMA_SKOR,
      messages: [
        { role: "system", content: SYSTEM_PENILAIAN },
        {
          role: "user",
          content: `Materi: ${k.mapel}.\n\nTranskrip diskusi:\n${k.transkrip}\n\nNilai sekarang. Keluarkan HANYA JSON.`,
        },
      ],
    }),
  });
  if (!res.ok) return { gagal: `${res.status} ${await res.text()}` };
  const j = await res.json();
  try {
    return JSON.parse(j.choices[0].message.content);
  } catch {
    return { gagal: "JSON tidak terbaca: " + j.choices?.[0]?.message?.content?.slice(0, 200) };
  }
}

const DIM = ["interpretasi", "analisis", "evaluasi", "inferensi", "eksplanasi", "regulasi_diri"];
const semua = [];

for (const k of KASUS) {
  const jalan = [];
  for (let i = 0; i < ULANG; i++) jalan.push(await nilai(k));
  semua.push({ id: k.id, harapan: k.harapan, jalan });

  const skor = jalan.map((r) => r.skor).filter((n) => typeof n === "number");
  const rata = skor.length ? (skor.reduce((a, b) => a + b, 0) / skor.length).toFixed(1) : "—";
  console.log(
    `${k.id.padEnd(14)} harapan ${k.harapan.padEnd(22)} skor: [${skor.join(", ")}] rata ${rata}` +
      (skor.length ? `  rentang ${Math.max(...skor) - Math.min(...skor)}` : ""),
  );
  const g = jalan.filter((r) => r.gagal);
  if (g.length) console.log("   GAGAL:", g[0].gagal);
  const r0 = jalan[0];
  if (!r0.gagal) {
    console.log("   dimensi:", DIM.map((d) => `${d.slice(0, 5)}=${r0[d]}`).join(" "));
    console.log("   kekurangan:", String(r0.kekurangan).slice(0, 150));
  }
}

fs.writeFileSync("hasil-nilai.json", JSON.stringify(semua, null, 2));
