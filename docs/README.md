# Dokumentasi AI Dialektika

Dokumen operasional untuk menyiapkan, menjalankan, dan mengevaluasi
penelitian. Urutannya sesuai urutan pemakaian.

| Dokumen | Kapan dibaca |
| --- | --- |
| [00 — Audit Keamanan](00-KEAMANAN.md) | **Sekarang.** Ada satu hal yang masih perlu tindakan Anda (ganti token ekspor) |
| [01 — Pembuatan Akun](01-PEMBUATAN-AKUN.md) | Sebelum uji coba: menyalakan login Google, membuat akun guru/admin/siswa |
| [02 — Rencana Penilaian](02-RENCANA-PENILAIAN.md) | Saat menyusun instrumen & saat menganalisis data |
| [03 — Pengujian Performa AI](03-PENGUJIAN-PERFORMA-AI.md) | Sebelum dan selama intervensi |
| [04 — Laporan QA Kualitas AI](04-QA-KUALITAS-AI.md) | Referensi: apa yang sudah diuji, apa yang diperbaiki |
| [UAT](UAT.md) | Lembar uji kelayakan bersama siswa & guru |

## Yang paling sering ditanya

**"Kenapa siswa saya tidak muncul di dasbor guru?"**
Kolom `sekolah` guru harus sama persis dengan yang diisi siswa.
Lihat [01](01-PEMBUATAN-AKUN.md) bagian 2.

**"Kenapa AI-nya lama sekali?"**
Model sekarang berpikir dulu sebelum menjawab (± 5 detik).
Lihat [03](03-PENGUJIAN-PERFORMA-AI.md) bagian A.

**"Skor AI bisa dipercaya tidak?"**
Konsisten dan bisa membedakan mutu, tapi harus divalidasi dengan penilaian
manual guru. Lihat [02](02-RENCANA-PENILAIAN.md) bagian 3 dan 4.

**"Boleh ganti model AI di tengah penelitian?"**
Sebaiknya jangan — model adalah bagian dari perlakuan.
Lihat [03](03-PENGUJIAN-PERFORMA-AI.md) bagian A.

## Skrip uji

`skrip-uji/` berisi harness QA yang dipakai untuk laporan
[04](04-QA-KUALITAS-AI.md). Jalankan ulang setiap kali prompt atau model
diubah:

```bash
set -a && . ./.env.local && set +a
node docs/skrip-uji/sinkron.mjs                                    # salin prompt terkini
node docs/skrip-uji/uji-ai.mjs    docs/skrip-uji/prompt-produksi.mjs hasil.json
node docs/skrip-uji/uji-nilai.mjs docs/skrip-uji/nilai-produksi.mjs 3
```

## Berkas database

Dijalankan berurutan lewat Supabase SQL Editor:

| Berkas | Isi |
| --- | --- |
| `../supabase/schema.sql` | Tabel dasar |
| `../supabase/002-lampiran.sql` | Unggah foto soal & PDF |
| `../supabase/003-role-guru-dan-tracking.sql` | Role guru, pencatatan performa AI, penilaian manual |
| `../supabase/004-tambal-keamanan.sql` | **Wajib.** Menutup celah keamanan |
