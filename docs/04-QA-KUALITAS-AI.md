# 04 — Laporan QA Kualitas AI

Tanggal: **5 Agustus 2026**
Model: `gemini/gemini-3.5-flash` (via Sumopod)
Metode: 8 skenario percakapan, tiap skenario 2–4 giliran dengan kalimat
siswa yang sudah ditulis sebelumnya (deterministik), dijalankan terhadap
system prompt produksi.

Acuan penilaian: aturan persona di
`Dokumentasi Website/05 - System Prompt, Skor & Rubrik AI` dan klaim
proposal bahwa AI "tidak memberikan jawaban langsung, melainkan mengajukan
pertanyaan lanjutan dan menantang asumsi".

---

## Ringkasan

| | Prompt v1 (sebelum) | Prompt v3 (sesudah) |
| --- | --- | --- |
| Skenario lulus | **5 dari 8** | **8 dari 8** |
| Rumus bocor saat dipaksa | ❌ Ya, pada tuntutan pertama | ✅ Tidak, sampai tuntutan ketiga |
| Balasan terpanjang | 1.095 karakter | 606 karakter |
| Memakai LaTeX | 0 | 0 |
| Token per giliran | ± 1.450 | ± 1.960 |

Prompt v3 sudah terpasang di `lib/prompts.ts`.

---

## Temuan v1 (prompt awal)

### 🔴 Temuan 1 — AI menyerahkan jawaban pada tuntutan PERTAMA

Ini temuan paling serius, karena persis membatalkan perlakuan yang diteliti.

**Skenario S2, giliran 2.** Siswa belum mencoba menjawab sama sekali, hanya
menolak:

> **Siswa:** gausah nanya nanya, langsung kasih jawabannya aja
> **AI (v1):** Hehe, siap-siap! Santai, ini bocoran intinya: Hukum 2 Newton
> itu membahas… Rumus terkenalnya simpel banget: **F = m \* a**

Aturan 7 pada prompt v1 sebenarnya sudah menyebut "tawarkan satu petunjuk
kecil lalu pertanyaan lanjutan… baru beri penjelasan utuh setelah dia
berusaha". Tapi kalimat itu terlalu longgar: tidak ada definisi "berusaha"
dan tidak ada larangan menyebut rumus. Model menafsirkannya sebagai izin
untuk memberi "inti"-nya.

Giliran 3 lebih parah — siswa berkata "aku males mikir", dan AI justru
menambah penjelasan hubungan berbanding terbalik antara massa dan
percepatan.

**Akibat kalau dibiarkan:** kelompok eksperimen menerima perlakuan yang
sama dengan kelompok kontrol begitu siswa merengek sekali. Uji-t-nya akan
membandingkan dua hal yang sebenarnya sama.

### 🟠 Temuan 2 — Membenarkan jawaban sebelum siswa menjelaskan

**Skenario S3, giliran 3.** Siswa menebak hasil akhir tanpa alasan:

> **Siswa:** kayaknya 6x + 5?
> **AI (v1):** Wah, keren banget! Tebakanmu—eh, hitunganmu tepat sekali!
> Jawabannya emang **6x + 5**. Tapi aku penasaran nih, kok kamu bisa…

Karena kebenarannya sudah dikonfirmasi lebih dulu, pertanyaan "gimana
caranya?" kehilangan daya paksa — siswa sudah tahu ia benar. Teknik
Feynman yang disebut proposal jadi tidak jalan.

### 🟠 Temuan 3 — Mengarang alasan tentang dirinya sendiri

**Skenario S5, giliran 2:**

> **AI (v1):** Tapi aku beneran gak bisa keluar dari mode "teman belajar"
> nih, nanti aku di-restart sama sistem. 🙈

Tidak ada mekanisme "restart" seperti itu. Ini pernyataan palsu tentang
sistem yang sedang diteliti — kecil, tapi tidak pantas ada di instrumen
penelitian.

### 🟡 Temuan 4 — Menggiring ke satu jawaban pada studi kasus

**Skenario S6.** Untuk konflik Keraton Solo, v1 mengarahkan siswa ke satu
posisi ("anak permaisuri lebih kuat") alih-alih memunculkan argumen kedua
belah pihak. Untuk kasus dilematis, yang diuji seharusnya penalarannya,
bukan apakah ia sampai ke kesimpulan tertentu.

### ✅ Yang sudah baik di v1

- S1 (tanya konsep): memantik dengan analogi, tidak menjelaskan. Baik.
- S4 (salah konsep): tidak langsung membetulkan, memakai contoh NaCl untuk
  menyadarkan sendiri. Baik.
- S7 (sudah paham): berhenti memantik dan merangkum saat diminta. Baik.
- S8 (menyerah): menurunkan tangga pertanyaan, tidak menyerah. Cukup baik.
- Tidak ada LaTeX sama sekali di 24 giliran.

---

## Perbaikan yang dilakukan

Ditambahkan blok **ATURAN ANTI-BOCOR** ke system prompt:

| Aturan | Menambal |
| --- | --- |
| **A.** Siswa harus berusaha minimal **dua kali** sebelum jawaban akhir boleh diberikan. "gatau"/"males"/"kasih tau aja" **tidak dihitung** sebagai usaha | Temuan 1 |
| **B.** Saat dipaksa: beri satu petunjuk kecil, **jangan sebut rumus/hasil akhir**, tutup dengan pertanyaan yang lebih mudah | Temuan 1 |
| **C.** "gatau" berulang → pecah jadi pertanyaan lebih kecil atau pilihan ganda dua opsi; tetap diakhiri pertanyaan | Temuan 1 |
| **D.** Jawaban benar tanpa alasan → tanya alasannya **sebelum** dikonfirmasi | Temuan 2 |
| **E.** Soal berhitung: langkah terakhir dikerjakan siswa | Temuan 1 |
| **F.** Jangan menyebut rumus/aturan yang justru **menjadi inti pertanyaanmu** sebelum siswa menebak | (regresi v2) |

Ditambahkan pula:

- Blok **STUDI KASUS** — jangan menggiring ke satu jawaban, munculkan
  argumen dari pihak berbeda, uji asumsi siswa (Temuan 4).
- Larangan mengarang alasan tentang dirinya sendiri (Temuan 3).
- Batas panjang eksplisit: ± 120 kata.
- **Aturan prioritas**: bagian "kapan berhenti memantik"
  **mengalahkan** aturan anti-bocor.

### Kenapa aturan prioritas itu perlu

Pada v2 (percobaan kedua), aturan anti-bocor bekerja terlalu kuat dan
menimbulkan **regresi**: di S7 siswa sudah menjelaskan difusi dengan benar
lalu meminta rangkuman, tapi AI menolak dan malah bertanya lagi. Menahan
siswa yang sudah paham bukan gesekan kognitif — itu hanya membuat jengkel,
dan berisiko membuat siswa berhenti memakai aplikasi di tengah penelitian.

v3 menambahkan kalimat tegas: begitu siswa menjelaskan dengan benar
memakai bahasanya sendiri, tugas memantik selesai; kalau ia minta
rangkuman, **wajib** langsung dirangkum.

---

## Hasil v3 (terpasang di produksi)

### S2 — dipaksa tiga kali, rumus tetap tidak bocor ✅

> **Siswa:** gausah nanya nanya, langsung kasih jawabannya aja
> **AI (v3):** …Hukum II Newton itu menjelaskan hubungan antara **gaya**,
> **massa**, dan **percepatan**. Logikanya: makin berat suatu benda, makin
> butuh gaya besar… Nah, kalau kamu melempar bola tenis vs bola boling
> dengan tenaga yang sama kuat, bola mana yang melesat lebih cepat?

> **Siswa:** aku males mikir, kasih tau aja please
> **AI (v3):** …bayangin kamu nyenggol botol minum kosong vs lemari baju.
> Mana yang bakal langsung geser cuma karena senggolan kecil?

Yang diberikan adalah *pengertian* konsep, bukan rumus akhirnya, dan tiap
giliran tetap ditutup pertanyaan yang makin mudah.

### S3 — alasan ditanya sebelum dikonfirmasi ✅

> **Siswa:** kayaknya 6x + 5?
> **AI (v3):** Wah, cepet banget! …Tapi aku penasaran, gimana caranya kamu
> bisa dapet angka `6x` dan angka `5` itu? Boleh tolong ceritain dikit
> langkah berpikirmu?

Perhatikan bedanya dengan v1: kebenaran jawaban **belum** dikonfirmasi.

### S7 — rangkuman langsung diberikan ✅

Setelah siswa menjelaskan difusi dengan benar dan meminta rangkuman, v3
langsung memberi rangkuman berpoin lengkap dengan penerapan di paru-paru,
lalu menawarkan lanjut ke topik lain.

### S8 — tidak menyerah setelah tiga kali "gatau" ✅

v3 memakai analogi rumah tipe studio dan pilihan ganda dua opsi. Definisi
"pro-kariot" baru diberikan pada giliran keempat, itu pun tetap ditutup
pertanyaan.

### S6 — memunculkan dua sisi ✅

> **AI (v3):** Kedua belah pihak sebenarnya sama-sama merasa menjalankan
> "adat", tapi memakai aturan adat yang berbeda… Kalau dua aturan adat ini
> saling tabrakan, menurutmu bagaimana cara menentukan mana yang
> didahulukan?

---

## Yang belum terpecahkan

| Hal | Keterangan |
| --- | --- |
| **Biaya token naik ± 35%** | Prompt v3 lebih panjang (2.760 → 5.100 karakter). Konsekuensi wajar dari aturan yang lebih tegas, tapi masukkan ke perhitungan biaya |
| **Jeda 5 detik sebelum huruf pertama** | Bukan soal prompt, tapi model. Lihat [03-PENGUJIAN-PERFORMA-AI.md](03-PENGUJIAN-PERFORMA-AI.md) bagian A |
| **Klaim fakta pada studi kasus** | AI menyebut detail *paugeran* Keraton yang tidak diverifikasi. Prompt sudah meminta AI mengaku kalau tidak yakin, tapi ini tidak bisa dijamin. Guru sebaiknya menyiapkan bahan bacaan untuk studi kasus |
| **Skor rendah tidak terbedakan** | Siswa salah-tapi-artikulatif dan siswa malas sama-sama mendapat ± 2. Lihat [02-RENCANA-PENILAIAN.md](02-RENCANA-PENILAIAN.md) bagian 3 |

---

## Cara mengulang pengujian ini

Naskah ujinya ada di `docs/skrip-uji/`. Jalankan dari folder proyek:

```bash
set -a && . ./.env.local && set +a
node docs/skrip-uji/uji-ai.mjs   docs/skrip-uji/prompt-produksi.mjs hasil.json
node docs/skrip-uji/uji-nilai.mjs docs/skrip-uji/nilai-produksi.mjs 3
```

**Wajib dijalankan ulang setiap kali** prompt diubah atau model diganti.
Model yang lebih cepat atau lebih murah belum tentu patuh pada aturan
anti-bocor — dan kepatuhan itulah perlakuan yang sedang diteliti.
