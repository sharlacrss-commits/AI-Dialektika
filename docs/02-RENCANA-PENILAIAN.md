# 02 — Rencana Penilaian

Bagaimana kemampuan berpikir kritis siswa diukur, siapa yang menilai apa,
dan bagaimana angka-angka itu berubah jadi data yang bisa diuji secara
statistik.

Acuan: proposal OPSI *"Model AI Dialektika: Rekonstruksi Gesekan Kognitif
untuk Menumbuhkan Nalar Kritis Siswa SMA di Surakarta"* dan enam
keterampilan berpikir kritis Facione (1990).

---

## 1. Tiga lapis penilaian (jangan tertukar)

Aplikasi ini menghasilkan **tiga** jenis angka yang gunanya berbeda.
Kesalahan paling umum adalah memakai lapis 2 untuk menjawab pertanyaan
penelitian utama — padahal itu tugas lapis 1.

> **Catatan cakupan.** Aplikasi ini hanya dipakai kelompok **eksperimen**.
> Kelompok kontrol belajar dengan cara/AI lain di luar aplikasi, jadi
> lapis 2 dan 3 di bawah hanya tersedia untuk kelompok eksperimen.
> Perbandingan antar-kelompok sepenuhnya bersandar pada lapis 1.

| Lapis | Apa | Siapa yang menilai | Dipakai untuk |
| --- | --- | --- | --- |
| **1. Pre-test & post-test** | Soal pilihan ganda + studi kasus, di luar aplikasi | Peneliti/guru | **Menjawab hipotesis utama** (uji-t) |
| **2. Skor sesi** | Skor 1–10 + 6 keterampilan, tiap akhir sesi | AI | Umpan balik ke siswa, memantau proses, data pendukung |
| **3. Penilaian manual guru** | Rubrik sama, atas transkrip yang sama | Guru | **Menguji apakah lapis 2 layak dipercaya** |

> **Hipotesis utama diuji dengan lapis 1, bukan lapis 2.** Skor AI tidak
> boleh jadi satu-satunya alat ukur, karena AI-nya sendiri adalah objek
> yang sedang diteliti — memakai skor AI untuk membuktikan AI itu berhasil
> adalah penalaran melingkar.

---

## 2. Lapis 1 — Pre-test & post-test

### Bentuk
Sesuai proposal: soal pilihan ganda dan studi kasus tentang masalah nyata
di masyarakat (contoh dalam proposal: konflik perebutan tahta Keraton Solo).

### Aturan yang wajib dijaga

| Aturan | Alasan |
| --- | --- |
| Soal pre-test dan post-test **setara, bukan sama persis** | Kalau sama persis, siswa mengingat jawabannya (testing effect), bukan jadi lebih kritis |
| Kedua kelompok mengerjakan soal **identik** | Kalau berbeda, selisihnya tidak bisa dibandingkan |
| Dikerjakan **tanpa AI**, diawasi | Kalau boleh pakai AI, yang diukur adalah AI-nya |
| Dinilai dengan rubrik tertulis, **penilai tidak tahu** siswa itu kelompok mana | Mencegah bias penilai |

### Rubrik studi kasus (6 keterampilan Facione, tiap butir 1–10)

| Keterampilan | Yang dicari pada jawaban siswa |
| --- | --- |
| Interpretasi | Menangkap inti masalah dan istilah kunci dengan benar |
| Analisis | Menguraikan hubungan sebab–akibat antar pihak/konsep |
| Evaluasi | Menimbang kekuatan bukti, tidak menelan klaim mentah-mentah |
| Inferensi | Menarik kesimpulan yang benar-benar didukung bukti yang disebut |
| Eksplanasi | Menyusun alur penalaran yang bisa diikuti orang lain |
| Regulasi diri | Menyadari batas pengetahuannya, mengoreksi diri |

Skor total = rata-rata enam butir. Rentang penafsiran mengikuti rubrik
aplikasi: 1–3 belum paham · 4–6 paham dasar · 7–8 paham baik ·
9–10 paham mendalam.

### Pengolahan data

Sesuai proposal, memakai **uji-t independen** atas **selisih**
(gain = post-test − pre-test) antara kelompok eksperimen dan kontrol.

```
gain_i = post_i − pre_i
H0 : rata-rata gain eksperimen = rata-rata gain kontrol
H1 : rata-rata gain eksperimen > rata-rata gain kontrol
```

Sebelum uji-t, periksa dulu:

1. **Normalitas** gain tiap kelompok (Shapiro-Wilk). Kalau tidak normal,
   pakai **Mann-Whitney U**, bukan uji-t.
2. **Homogenitas ragam** (Levene). Kalau tidak homogen, pakai uji-t
   **Welch** (di SPSS: baris "Equal variances not assumed").
3. **Kesetaraan awal**: uji-t atas skor *pre-test* saja. Kalau kedua
   kelompok sudah berbeda sejak awal, gain-nya sulit ditafsirkan dan
   sebaiknya lanjut ke ANCOVA dengan pre-test sebagai kovariat.

Laporkan juga **ukuran efek** (Cohen's d), bukan hanya nilai p.
Dengan 30 siswa per kelompok, d ≈ 0,74 baru tercapai kekuatan uji 80%.
Artinya: efek kecil kemungkinan besar tidak akan terdeteksi — sebutkan
ini sebagai keterbatasan penelitian, jangan sampai "tidak signifikan"
disalahartikan sebagai "tidak berpengaruh".

---

## 3. Lapis 2 — Skor sesi oleh AI

### Cara kerja
Saat siswa menekan **Akhiri & Nilai**, seluruh transkrip dikirim ke model
dengan rubrik Facione dan skema JSON ketat (`SKEMA_SKOR` di
`lib/prompts.ts`). Hasilnya disimpan di tabel `scores`.

### Penjagaan yang sudah dipasang

| Penjagaan | Kenapa |
| --- | --- |
| Sesi dengan < 2 jawaban siswa **ditolak** untuk dinilai | Mencegah siswa membuka sesi lalu langsung minta nilai |
| Skor **hanya boleh ditulis server**, bukan browser | Sebelumnya siswa bisa mengarang skor 10 dari konsol browser |
| Penilaian yang tidak lengkap **gagal terang-terangan** | Lebih baik error daripada menyimpan angka palsu |
| Status sesi jadi `selesai` **hanya** lewat jalur penilaian | Mencegah sesi ditutup tanpa dinilai |

### Sifat yang sudah teruji (5 Agustus 2026)

Diuji dengan lima transkrip buatan yang mutunya sengaja berbeda, tiap
transkrip dinilai 2–3 kali:

| Transkrip | Harapan | Skor AI | Rentang antar-pengulangan |
| --- | --- | --- | --- |
| Siswa kuat, mengoreksi diri | 8–10 | **9,5** | 1 |
| Siswa baik, sadar batas tahunya | 7–8 | **8,0** | 0 |
| Siswa sedang, ragu-ragu | 5–7 | **6,0** | 0 |
| Siswa salah tapi percaya diri | 3–5 | **2,0** | 0 |
| Siswa malas, jawab "gatau" | 1–4 | **2,0** | 0 |

**Kesimpulan:** konsisten (nilai nyaris tidak berubah saat diulang) dan
mampu membedakan mutu di rentang 6–10. **Catatan penting:** siswa yang
salah paham tapi artikulatif mendapat skor yang sama dengan siswa yang
tidak menjawab sama sekali (2,0). Untuk analisis, jangan perlakukan skor
rendah sebagai satu kelompok homogen — periksa transkripnya.

---

## 4. Lapis 3 — Penilaian manual guru

### Kenapa perlu
Ini yang membedakan "AI memberi angka" dari "angka AI bisa dipercaya".
Tanpa lapis ini, skor AI tidak punya bukti validitas apa pun.

### Cara
Guru buka `/guru` → pilih siswa → pilih sesi yang sudah **selesai** →
gulir ke bawah → isi **Penilaian manual Anda**. Rubriknya sama persis
dengan yang dipakai AI.

Skor AI ditampilkan di sebelah slider **sebagai pembanding**, tapi slider
sengaja **tidak** diisi dengan angka AI. Kalau slider dimulai dari angka
AI, guru cenderung sekadar menyetujuinya (efek jangkar) dan
perbandingannya kehilangan makna.

### Berapa sesi yang perlu dinilai manual

| Jumlah sesi | Kegunaan |
| --- | --- |
| < 10 | Belum bisa disimpulkan apa-apa |
| **20–30** | **Target minimal.** Cukup untuk melaporkan tingkat kesepakatan |
| 50+ | Bisa menghitung koefisien kesepakatan yang kuat |

Pilih sesinya **acak**, bukan yang paling menarik. Kalau bisa, minta
**dua guru** menilai 10 sesi yang sama — itu memberi pembanding
antar-penilai manusia, sehingga bisa dijawab "AI meleset 1,2 poin — tapi
dua guru pun beda 1,0 poin, jadi wajar".

### Membaca hasilnya

Halaman `/guru/rekap` menghitung otomatis:

| Angka | Cara membaca |
| --- | --- |
| Rata-rata selisih | 0 = identik. **≤ 1,0 sangat baik · ≤ 1,5 layak · > 2,0 perlu koreksi** |
| % selisih ≤ 1 poin | Target ≥ 70% |
| Kecenderungan (AI − guru) | Positif = AI lebih murah hati. Kalau tetap ≥ +1,5 setelah 20 sesi, sebutkan sebagai bias sistematis di laporan |
| Selisih per keterampilan | Menunjukkan dimensi mana yang paling sering dinilai berbeda |

Untuk laporan, hitung juga **korelasi Pearson** antara skor AI dan skor
guru dari kolom `skor` dan `guru_skor` di CSV ekspor. r ≥ 0,7 sudah
memadai untuk menyebut penilaian AI "cukup sejalan dengan penilai manusia".

---

## 5. Data yang keluar dari sistem

Ekspor CSV: login sebagai admin lalu buka `/api/export`, atau dari terminal:

```bash
curl -H "Authorization: Bearer <ADMIN_EXPORT_TOKEN>" \
     https://<domain>/api/export -o data-riset.csv
```

Kolom yang tersedia:

| Kelompok kolom | Isi |
| --- | --- |
| Identitas | `kode_siswa`, `kelompok`, `kelas`, `sekolah` |
| Sesi | `mapel`, `topik`, `status`, `mulai_at`, `selesai_at`, `durasi_menit` |
| Keterlibatan | `pesan_siswa`, `pesan_ai`, `kata_siswa` |
| Skor AI | `skor` + 6 keterampilan |
| Skor guru | `guru_skor` + 6 keterampilan |
| Turunan | `selisih_skor` |

**Nama asli siswa tidak ikut diekspor** — hanya kode siswa.

### Menyaring data sebelum analisis

Buang atau tandai baris yang:

- `status` masih `berlangsung` (sesi tidak pernah diselesaikan)
- `pesan_siswa` < 2 (siswa tidak benar-benar berdiskusi)
- `durasi_menit` < 2 dengan `skor` tinggi (mencurigakan)
- `kata_siswa` sangat kecil dibanding siswa lain (jawaban satu kata terus)

Laporkan berapa baris yang dibuang dan alasannya. Menyembunyikan
penyaringan data adalah masalah integritas, menyebutkannya justru
memperkuat laporan.

---

## 6. Jadwal penilaian (menyesuaikan proposal)

| Tahap | Kegiatan penilaian |
| --- | --- |
| Sebelum intervensi | Pre-test kedua kelompok, tanpa AI, diawasi |
| Selama intervensi | Skor sesi berjalan otomatis. Guru menilai manual **secara berkala**, jangan menumpuk di akhir |
| Setelah intervensi | Post-test kedua kelompok |
| Analisis | Uji-t gain (lapis 1) · rekap kesepakatan AI–guru (lapis 3) · statistik deskriptif sesi (lapis 2) |
| Pelaporan | Sertakan ukuran efek, jumlah data yang dibuang, dan keterbatasan |

---

## 7. Etika data

- Persetujuan siswa dicatat di kolom `consent` dan `consent_at`, diambil
  saat onboarding. Untuk siswa di bawah 18 tahun, tetap perlu izin
  orang tua/wali di luar aplikasi.
- Penghubung kode siswa → nama asli hanya ada di dasbor guru `/guru`,
  yang cuma bisa dibuka guru sekolah bersangkutan dan admin. Kode
  dibuat otomatis oleh sistem, siswa tidak perlu tahu kodenya.
- Transkrip diskusi bisa memuat hal pribadi yang diceritakan siswa.
  Perlakukan sebagai data rahasia; kalau dikutip di laporan, samarkan.
- Siswa berhak mundur. Cara menghapus datanya:
  ```sql
  delete from auth.users where email = 'email-siswa@contoh.com';
  ```
  Semua sesi, pesan, dan skornya ikut terhapus otomatis.
