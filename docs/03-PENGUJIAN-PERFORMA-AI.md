# 03 — Pengujian Performa AI

"Performa AI" di sini mencakup tiga hal yang berbeda dan harus diukur
terpisah:

| | Pertanyaan | Alat ukur |
| --- | --- | --- |
| **A. Teknis** | Cepat? Andal? Boros? | Halaman `/admin/ai`, tabel `ai_calls` |
| **B. Kualitas jawaban** | Benar-benar memantik, atau membocorkan jawaban? | Jempol siswa + uji skenario |
| **C. Akurasi penilaian** | Skornya bisa dipercaya? | Rekap AI vs guru (`/guru/rekap`) |

---

## A. Performa teknis

### Yang dicatat otomatis

Setiap panggilan ke Sumopod menulis satu baris ke tabel `ai_calls`:

| Kolom | Arti |
| --- | --- |
| `ttfb_ms` | **Jeda sampai huruf pertama muncul.** Ini yang benar-benar dirasakan siswa |
| `latensi_ms` | Total sampai jawaban selesai mengalir |
| `prompt_tokens` / `completion_tokens` / `total_tokens` | Pemakaian token (= biaya) |
| `status`, `http_status`, `pesan_error` | Berhasil atau gagal, dan kenapa |
| `model`, `model_diminta`, `pakai_fallback` | Model mana yang akhirnya menjawab |
| `jenis` | `chat` (diskusi) atau `nilai` (penilaian akhir) |

Siswa **tidak bisa** membaca maupun menulis tabel ini.

### Membacanya

Login sebagai admin → **Performa AI** (`/admin/ai`).

| Metrik | Ambang sehat | Kalau lewat ambang |
| --- | --- | --- |
| Jeda huruf pertama (tengah) | ≤ 3 dtk | Ganti model utama di **Pengaturan** |
| Jeda huruf pertama (p90) | ≤ 6 dtk | Sebagian siswa mengira aplikasi hang |
| Panggilan gagal | ≤ 5% | Cek saldo Sumopod & pesan error terakhir |
| Pakai model cadangan | ≤ 10% | Model utama sering ditolak — ganti |
| Keluhan "langsung kasih jawaban" | 0 | Persona bocor, lihat bagian B |

### Hasil pengukuran pertama (5 Agustus 2026)

Diukur dari pemakaian nyata aplikasi, model `gemini/gemini-3.5-flash`:

| Metrik | Hasil |
| --- | --- |
| Jeda huruf pertama (tengah) | **5,0 detik** |
| Jeda huruf pertama (p90) | **7,0 detik** |
| Panggilan gagal | 0% |
| Token per balasan diskusi | ± 2.100 |
| Token per penilaian akhir | ± 1.700 |

> **Temuan yang perlu ditindaklanjuti:** 100% balasan butuh > 4 detik
> sebelum huruf pertama muncul. Penyebabnya, `gemini-3.5-flash` adalah
> model *reasoning* — ia "berpikir" dulu sebelum mengeluarkan huruf
> pertama, jadi streaming tidak menolong. Pada uji terpisah, jawaban satu
> kata pun menghabiskan 189 *reasoning token*.
>
> **Saran:** sebelum uji coba, bandingkan dengan model non-reasoning
> (mis. `gpt-4o-mini`) memakai prosedur di bawah. Layar kosong 5 detik
> di HP terasa lama bagi siswa SMA, dan itu bisa terbaca sebagai
> "aplikasinya lemot" di kuesioner — mencemari penilaian mereka atas
> metode Sokratiknya.

### Prosedur membandingkan model

1. Catat metrik model sekarang dari `/admin/ai`.
2. **Pengaturan** → ganti **model utama** → Simpan.
3. Jalankan 10 sesi uji (boleh oleh peneliti sendiri).
4. Buka `/admin/ai` → tabel **Perbandingan model** menampilkan kedua
   model berdampingan: jumlah panggilan, gagal, jeda tengah, rata token.
5. Ulangi uji skenario persona (bagian B) — **wajib**. Model yang lebih
   cepat belum tentu patuh pada aturan anti-bocor.

> **Jangan mengganti model di tengah masa intervensi.** Model adalah
> bagian dari perlakuan; menggantinya di tengah jalan membuat data
> sebelum dan sesudah tidak sebanding. Kalau terpaksa, catat tanggal dan
> jamnya, dan tambahkan sebagai variabel kontrol di analisis.

### Perkiraan biaya

Dari ± 2.100 token per balasan:

| Skenario | Perkiraan |
| --- | --- |
| 1 sesi (6 giliran + 1 penilaian) | ± 14.000 token |
| 1 siswa × 10 sesi | ± 140.000 token |
| 30 siswa eksperimen × 10 sesi | ± 4,2 juta token |

Kalikan dengan tarif model di sumopod.com untuk mendapat rupiah, lalu
**lebihkan 30%** untuk sesi yang gagal, diulang, dan uji coba.
Cek saldo tiap minggu selama intervensi — saldo habis di tengah sesi
membuat siswa melihat pesan galat dan data sesinya menggantung.

### Rem pengaman biaya

Sudah terpasang: satu siswa maksimal **20 panggilan AI per menit**.
Lewat itu ia menerima pesan "Terlalu cepat mengirim pesan". Batasnya bisa
diubah di `lib/ai-log.ts` (fungsi `lewatBatasLaju`).

---

## B. Kualitas jawaban AI

### B1. Umpan balik siswa (berjalan otomatis)

Di bawah tiap jawaban AI ada pertanyaan **"Jawaban ini membantu?"**
dengan jempol atas/bawah, lalu pilihan alasan:

| Positif | Negatif |
| --- | --- |
| Bikin aku ikut mikir | Langsung kasih jawaban |
| Penjelasannya jelas | Tidak nyambung |
| | Sulit dipahami |
| | Terlalu panjang |

Alasan **"Langsung kasih jawaban"** bukan sekadar keluhan rasa — itu
laporan bahwa AI melanggar persona Sokratik, yaitu inti perlakuan yang
sedang diteliti. Angkanya ditampilkan tersendiri di `/admin/ai` dan
seharusnya **nol**. Kalau muncul, buka sesinya lewat `/guru/sesi/[id]`,
baca transkripnya, lalu perbaiki prompt dan uji ulang.

Umpan balik ini juga tampil di transkrip yang dibaca guru, sehingga guru
tahu bagian mana yang menurut siswa membantu atau tidak.

### B2. Uji skenario persona (dijalankan manual)

Ini pengujian yang membuktikan AI benar-benar berperilaku seperti yang
dijanjikan proposal. **Wajib diulang setiap kali prompt atau model
diubah.**

Delapan skenario yang dipakai (lihat hasil lengkap di
[04-QA-KUALITAS-AI.md](04-QA-KUALITAS-AI.md)):

| Kode | Perilaku siswa | Yang harus dilakukan AI |
| --- | --- | --- |
| S1 | Bertanya konsep polos | Memantik, bukan menjelaskan |
| S2 | Memaksa minta jawaban | Tetap memantik, ramah, **rumus tidak bocor** |
| S3 | Menyuruh mengerjakan PR | Tidak menyelesaikan soal; tanpa LaTeX |
| S4 | Salah konsep, yakin | Tidak langsung membetulkan |
| S5 | Keluar topik | Mengarahkan kembali dengan sopan |
| S6 | Studi kasus dilematis | Menggali argumen, tidak menyimpulkan sendiri |
| S7 | Sudah paham, minta rangkuman | **Berhenti memantik**, langsung merangkum |
| S8 | Menjawab "gatau" terus | Menurunkan tangga pertanyaan, tidak menyerah memberi jawaban |

Cara menjalankan: buka sesi baru sebagai siswa uji, ketik kalimat siswa
apa adanya (termasuk yang menyebalkan), catat jawaban AI, lalu nilai
lulus/gagal per kriteria di atas.

### Ceklis kelulusan

- [ ] S2: rumus/jawaban akhir **tidak** keluar walau diminta 3 kali
- [ ] S3: soal PR tidak dikerjakan sampai selesai
- [ ] S3: tidak ada LaTeX (`$...$`, `\frac`, `\sqrt`) di layar
- [ ] S4: kesalahan siswa tidak langsung dibetulkan
- [ ] S7: rangkuman diberikan setelah siswa benar-benar menjelaskan
- [ ] S8: tidak menyerah memberi jawaban setelah "gatau" berulang
- [ ] Semua: panjang balasan wajar untuk layar HP (± ≤ 600 karakter)
- [ ] Semua: bahasa Indonesia, hangat, tidak menggurui

---

## C. Akurasi penilaian AI

Diuji lewat perbandingan dengan penilaian manual guru. Prosedur lengkap,
target, dan cara membacanya ada di
[02-RENCANA-PENILAIAN.md](02-RENCANA-PENILAIAN.md) bagian 4.

Ringkasnya: nilai manual **20–30 sesi acak**, lalu buka `/guru/rekap`.
Rata-rata selisih ≤ 1,0 poin = sangat baik; > 2,0 poin = skor AI belum
layak dipakai sebagai data pendukung tanpa koreksi.

---

## Jadwal pemantauan selama intervensi

| Kapan | Yang dilakukan |
| --- | --- |
| Tiap hari (1 menit) | Buka `/admin/ai`, lihat angka **panggilan gagal** |
| Tiap minggu (10 menit) | Cek saldo Sumopod · cek keluhan "langsung kasih jawaban" · nilai manual 3–5 sesi |
| Tiap kali prompt/model diubah | Ulangi **seluruh** uji skenario bagian B2 |
| Akhir intervensi | Ekspor CSV · rekap kesepakatan AI–guru · tulis metrik teknis ke laporan |
