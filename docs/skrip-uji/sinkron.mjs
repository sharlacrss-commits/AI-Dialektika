// Menyalin prompt terkini dari lib/prompts.ts ke berkas *-produksi.mjs,
// supaya skrip uji selalu menguji prompt yang BENAR-BENAR dipakai aplikasi.
//
// Jalankan dari folder proyek:
//   node docs/skrip-uji/sinkron.mjs
//
// Kenapa perlu: skrip uji berjalan di Node biasa dan tidak bisa mengimpor
// berkas TypeScript. Menyalin manual berisiko — prompt yang diuji jadi
// berbeda dari yang dipakai siswa, dan laporan QA-nya menyesatkan.

import fs from "node:fs";

const src = fs.readFileSync("lib/prompts.ts", "utf8");

function ambil(nama) {
  // Cocokkan: export const <nama> = `...isi...`;
  const pola = new RegExp("export const " + nama + " = `([\\s\\S]*?)`;");
  const m = src.match(pola);
  if (!m) throw new Error(`${nama} tidak ditemukan di lib/prompts.ts`);
  return m[1];
}

fs.writeFileSync(
  "docs/skrip-uji/prompt-produksi.mjs",
  "// Dihasilkan otomatis oleh sinkron.mjs. Jangan diedit langsung.\n" +
    "export const SYSTEM_DISKUSI = " +
    JSON.stringify(ambil("SYSTEM_DISKUSI")) +
    ";\n",
);

const skema = JSON.parse(
  fs.readFileSync("docs/skrip-uji/skema-skor.json", "utf8"),
);

fs.writeFileSync(
  "docs/skrip-uji/nilai-produksi.mjs",
  "// Dihasilkan otomatis oleh sinkron.mjs. Jangan diedit langsung.\n" +
    "export const SYSTEM_PENILAIAN = " +
    JSON.stringify(ambil("SYSTEM_PENILAIAN")) +
    ";\n" +
    "export const SKEMA_SKOR = " +
    JSON.stringify(skema) +
    ";\n",
);

console.log("Prompt produksi tersinkron ke docs/skrip-uji/*-produksi.mjs");
