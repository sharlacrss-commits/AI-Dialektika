import type { ReactNode } from "react";

// Penerjemah Markdown seadanya untuk balasan AI.
// Sengaja ditulis sendiri (bukan pakai library) supaya tidak menambah
// dependensi, karena AI hanya memakai sedikit format: **tebal**, *miring*,
// `kode`, judul, daftar berpoin, dan daftar bernomor.

// --- format di dalam satu baris ------------------------------
// Dua hal yang dijaga di sini:
//  1. Urutan alternatif: **tebal** harus dicoba sebelum *miring*, kalau
//     tidak "**x**" akan terbaca sebagai miring berisi "*x*".
//  2. Bintang harus MENEMPEL ke teks ([^\s*]), tidak boleh diapit spasi.
//     Tanpa syarat ini "3 * 4 = 12 dan 5 * 2 = 10" akan berubah jadi
//     miring — fatal untuk materi Matematika.
const INLINE =
  /(\*\*[^\s*][^*]*?[^\s*]\*\*|\*\*[^\s*]\*\*|\*[^\s*][^*\n]*?[^\s*]\*|\*[^\s*]\*|`[^`\n]+`)/g;

function inline(teks: string, kunci: string): ReactNode[] {
  const hasil: ReactNode[] = [];
  let akhir = 0;
  let n = 0;
  let m: RegExpExecArray | null;

  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(teks)) !== null) {
    if (m.index > akhir) hasil.push(teks.slice(akhir, m.index));
    const s = m[0];
    const k = `${kunci}-${n++}`;
    if (s.startsWith("**")) {
      hasil.push(
        <strong key={k} className="font-semibold">
          {s.slice(2, -2)}
        </strong>,
      );
    } else if (s.startsWith("`")) {
      hasil.push(
        <code
          key={k}
          className="rounded bg-black/5 px-1 py-0.5 font-mono text-[13px]"
        >
          {s.slice(1, -1)}
        </code>,
      );
    } else {
      hasil.push(<em key={k}>{s.slice(1, -1)}</em>);
    }
    akhir = m.index + s.length;
  }
  if (akhir < teks.length) hasil.push(teks.slice(akhir));
  return hasil;
}

// --- format antar baris --------------------------------------
const POIN = /^\s*[-*]\s+/;
const NOMOR = /^\s*\d+[.)]\s+/;
const JUDUL = /^(#{1,6})\s+(.*)$/;
// Garis pemisah. Diperiksa SEBELUM POIN, kalau tidak "---" terbaca sebagai
// butir daftar kosong dan muncul di layar sebagai teks "---" begitu saja.
const GARIS = /^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/;

export function Markdown({ teks }: { teks: string }) {
  const baris = teks.split("\n");
  const blok: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < baris.length) {
    const b = baris[i];

    if (!b.trim()) {
      i++;
      continue;
    }

    const judul = JUDUL.exec(b);
    if (judul) {
      blok.push(
        <p key={k} className="mt-3 font-semibold first:mt-0">
          {inline(judul[2], `j${k}`)}
        </p>,
      );
      k++;
      i++;
      continue;
    }

    if (GARIS.test(b)) {
      blok.push(<hr key={k} className="my-3 border-t border-current/15" />);
      k++;
      i++;
      continue;
    }

    if (POIN.test(b)) {
      const isi: string[] = [];
      while (i < baris.length && POIN.test(baris[i])) {
        isi.push(baris[i].replace(POIN, ""));
        i++;
      }
      blok.push(
        <ul key={k} className="mt-2 list-disc space-y-1 pl-5 first:mt-0">
          {isi.map((t, j) => (
            <li key={j}>{inline(t, `p${k}-${j}`)}</li>
          ))}
        </ul>,
      );
      k++;
      continue;
    }

    if (NOMOR.test(b)) {
      const isi: string[] = [];
      while (i < baris.length && NOMOR.test(baris[i])) {
        isi.push(baris[i].replace(NOMOR, ""));
        i++;
      }
      blok.push(
        <ol key={k} className="mt-2 list-decimal space-y-1 pl-5 first:mt-0">
          {isi.map((t, j) => (
            <li key={j}>{inline(t, `n${k}-${j}`)}</li>
          ))}
        </ol>,
      );
      k++;
      continue;
    }

    // Paragraf: kumpulkan baris berturut-turut yang bukan judul/daftar.
    const para: string[] = [];
    while (
      i < baris.length &&
      baris[i].trim() &&
      !POIN.test(baris[i]) &&
      !NOMOR.test(baris[i]) &&
      !JUDUL.test(baris[i]) &&
      !GARIS.test(baris[i])
    ) {
      para.push(baris[i]);
      i++;
    }
    blok.push(
      <p key={k} className="mt-2 whitespace-pre-wrap first:mt-0">
        {inline(para.join("\n"), `t${k}`)}
      </p>,
    );
    k++;
  }

  return <>{blok}</>;
}
