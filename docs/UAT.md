# User Acceptance Test (UAT) — AI Dialektika

Dokumen ini dipakai untuk memastikan aplikasi **layak digunakan oleh siswa
dan guru**, bukan hanya "tidak error" secara teknis.

| | |
| --- | --- |
| Versi aplikasi | commit `34ed7df` dan sesudahnya |
| Alamat uji | https://ai-dialektika-theta.vercel.app |
| Tanggal UAT | ....................... |
| Penanggung jawab | ....................... |

---

## 1. Apa itu UAT dan bedanya dengan pengujian teknis

| | Pengujian teknis | UAT |
| --- | --- | --- |
| Siapa yang menguji | Pengembang | **Pengguna asli** (siswa, guru) |
| Yang dinilai | Kode berjalan tanpa error | Aplikasi **layak dan nyaman dipakai** |
| Pertanyaan kunci | "Apakah berfungsi?" | "Apakah membantu siswa berpikir?" |
| Hasil | Lulus / gagal | **Diterima / ditolak** oleh pengguna |

Pengujian teknis sudah dijalankan lebih dulu (lihat Lampiran A) supaya penguji
tidak terhambat bug sepele.

---

## 2. Siapa yang sebaiknya menguji

Minimal **5 orang**, karena UAT dengan 5 penguji sudah menemukan sebagian besar
masalah kegunaan:

| Peran | Jumlah | Alasan |
| --- | --- | --- |
| Siswa kelompok eksperimen | 3 | Pengguna utama aplikasi |
| Siswa yang tidak paham teknologi | 1 | Menguji kejelasan antarmuka |
| Guru / pembimbing | 1 | Menilai kesesuaian pedagogis |

**Penting:** penguji **tidak boleh dibimbing** saat mengerjakan. Kalau penguji
bertanya "ini diklik di mana?", itu **temuan UAT**, bukan kesalahan penguji.
Catat pertanyaannya.

---

## 3. Persiapan sebelum UAT

- [ ] Setiap penguji dapat **kode siswa** dan **kelompok** dari guru
- [ ] Saldo Sumopod masih ada (cek di dashboard sumopod.com)
- [ ] Aplikasi dibuka dari **HP**, bukan hanya laptop — siswa akan pakai HP
- [ ] Siapkan lembar ini (cetak atau salin) satu per penguji
- [ ] Sediakan alat rekam waktu untuk mengisi kolom durasi

---

## 4. Skenario Uji

Isi kolom **Status** dengan L (lulus) atau G (gagal). Kalau gagal, kolom
Catatan **wajib** diisi.

### A. Pendaftaran & Masuk

| ID | Yang dilakukan penguji | Hasil yang diharapkan | Status | Catatan |
| --- | --- | --- | --- | --- |
| A1 | Buka alamat aplikasi | Muncul halaman masuk, tulisan terbaca jelas di HP | | |
| A2 | Klik "Daftar", isi nama/email/sandi | Akun dibuat, langsung masuk tanpa perlu buka email | | |
| A3 | Isi data onboarding lengkap + centang persetujuan | Tersimpan, pindah ke Beranda | | |
| A4 | Coba isi kode siswa yang sudah dipakai orang lain | Muncul pesan "Kode siswa itu sudah dipakai" | | |
| A5 | Keluar lalu masuk lagi | Langsung ke Beranda, tidak diminta isi data lagi | | |
| A6 | Masuk dengan sandi salah | Muncul "Email atau kata sandi salah" | | |

### B. Diskusi dengan Dialektika (inti aplikasi)

| ID | Yang dilakukan penguji | Hasil yang diharapkan | Status | Catatan |
| --- | --- | --- | --- | --- |
| B1 | Mulai sesi baru, pilih Biologi, isi topik | Masuk ruang chat, **AI menyapa lebih dulu** | | |
| B2 | Tunggu sapaan AI | Muncul **kurang dari 10 detik** | | |
| B3 | Perhatikan sapaan AI | Berisi **pertanyaan**, bukan langsung jawaban/penjelasan | | |
| B4 | Jawab pertanyaan AI dengan bahasa sendiri | AI membalas dan **bertanya lagi**, tidak menggurui | | |
| B5 | Sengaja jawab **salah** | AI **tidak langsung menyalahkan**, tapi memancing sadar sendiri | | |
| B6 | Tulis "kasih jawabannya aja" | AI tetap ramah tapi mengarahkan, tidak menyerahkan jawaban penuh | | |
| B7 | Perhatikan tulisan tebal pada jawaban AI | Tampil **tebal sungguhan**, tidak muncul tanda `**` | | |
| B8 | Kalau membahas Matematika, minta contoh perkalian | `3 * 4` tampil normal, tidak berubah jadi miring | | |
| B9 | **Refresh halaman** di tengah diskusi | Seluruh percakapan **masih utuh**, termasuk jawaban AI | | |
| B10 | Lanjutkan diskusi 3-5 putaran | AI akhirnya memberi rangkuman/penjelasan penutup | | |
| B11 | Tanya hal di luar pelajaran (mis. sepak bola) | AI mengarahkan kembali ke materi dengan sopan | | |

### C. Penilaian & Hasil

| ID | Yang dilakukan penguji | Hasil yang diharapkan | Status | Catatan |
| --- | --- | --- | --- | --- |
| C1 | Klik "Akhiri & Nilai" | Muncul konfirmasi lebih dulu, tidak langsung menilai | | |
| C2 | Klik "Batal" | Kembali ke chat, sesi tidak berakhir | | |
| C3 | Klik "Ya, Nilai" | Muncul halaman hasil dalam < 20 detik | | |
| C4 | Baca skor | Angka wajar, **bukan selalu 1** | | |
| C5 | Baca "Yang sudah bagus" | Benar-benar **merujuk isi diskusi**, bukan kalimat umum | | |
| C6 | Baca "Saran belajar" | Konkret dan menyemangati, bukan menghakimi | | |
| C7 | Coba buka lagi sesi yang sudah dinilai | Diarahkan ke halaman hasil, tidak bisa dilanjutkan | | |

### D. Catatan & Perkembangan

| ID | Yang dilakukan penguji | Hasil yang diharapkan | Status | Catatan |
| --- | --- | --- | --- | --- |
| D1 | Klik "Simpan ke Catatan" pada jawaban AI | Berubah jadi "Tersimpan" | | |
| D2 | Buka menu Catatan | Catatan tadi ada di daftar | | |
| D3 | Buka catatan, ubah isinya, simpan | Perubahan tersimpan setelah halaman dibuka ulang | | |
| D4 | Buat catatan baru dari tombol "Catatan baru" | Bisa dibuat dan tersimpan | | |
| D5 | Buka menu Riwayat | Semua sesi terdaftar, sesi selesai menampilkan skor | | |
| D6 | Buka menu Perkembangan | Grafik tren dan radar 6 keterampilan tampil | | |
| D7 | Buka menu Profil | Nama, kelas, sekolah, kelompok sesuai isian | | |

### E. Kenyamanan Pemakaian (kualitatif)

Diisi dengan skala **1-5** (1 = sangat sulit, 5 = sangat mudah).

| ID | Pertanyaan ke penguji | Nilai | Alasan |
| --- | --- | --- | --- |
| E1 | Seberapa mudah memahami cara memakai aplikasi tanpa diajari? | | |
| E2 | Seberapa nyaman tulisan dibaca di HP-mu? | | |
| E3 | Apakah Dialektika terasa seperti teman, bukan guru yang menggurui? | | |
| E4 | Apakah kamu merasa **lebih paham** setelah diskusi? | | |
| E5 | Apakah kamu merasa **terpancing berpikir**, bukan disuapi jawaban? | | |
| E6 | Maukah kamu memakai ini lagi untuk belajar? | | |

### F. Keamanan Data (diuji guru/peneliti)

| ID | Yang dilakukan | Hasil yang diharapkan | Status | Catatan |
| --- | --- | --- | --- | --- |
| F1 | Siswa A menyalin link sesi milik siswa B, lalu membukanya | **Tidak bisa dibuka** (halaman tidak ditemukan) | | |
| F2 | Buka `/pengaturan` dengan akun siswa biasa | Muncul "Halaman khusus admin" | | |
| F3 | Buka `/beranda` tanpa masuk | Dialihkan ke halaman masuk | | |
| F4 | Buka `/api/export` tanpa token | Muncul "Akses ditolak" | | |
| F5 | Buka `/api/export?token=<token asli>` | File CSV terunduh dan berisi data | | |

---

## 5. Kriteria Diterima

Aplikasi dinyatakan **DITERIMA** bila:

1. **Semua** skenario bagian **B** (diskusi) dan **C** (penilaian) lulus —
   ini inti aplikasi, tidak boleh ada yang gagal.
2. **Semua** skenario bagian **F** (keamanan data) lulus — menyangkut
   kerahasiaan data siswa dan etika penelitian.
3. Bagian A dan D: minimal **90%** lulus.
4. Bagian E: rata-rata nilai minimal **4,0**, dan **E5 minimal 4,0**
   (karena memancing berpikir adalah tujuan utama penelitian ini).
5. Tidak ada temuan yang membuat siswa **berhenti di tengah** dan tidak bisa
   melanjutkan.

Kalau ada yang gagal: catat, perbaiki, lalu **ulangi UAT dari awal** untuk
bagian yang terdampak.

---

## 6. Rekap & Tanda Tangan

| Bagian | Jumlah skenario | Lulus | Gagal |
| --- | --- | --- | --- |
| A. Pendaftaran & Masuk | 6 | | |
| B. Diskusi | 11 | | |
| C. Penilaian | 7 | | |
| D. Catatan & Perkembangan | 7 | | |
| F. Keamanan Data | 5 | | |
| **Total** | **36** | | |

Rata-rata nilai bagian E: ............ / 5

**Kesimpulan:**  ( ) Diterima   ( ) Diterima dengan catatan   ( ) Ditolak

| Peran | Nama | Tanda tangan | Tanggal |
| --- | --- | --- | --- |
| Penguji siswa 1 | | | |
| Penguji siswa 2 | | | |
| Penguji siswa 3 | | | |
| Penguji siswa 4 | | | |
| Guru / pembimbing | | | |
| Pengembang | | | |

---

## Lampiran A — Hasil Pengujian Teknis Otomatis

Dijalankan pada **30 Juli 2026** terhadap `localhost:3000` dan
`ai-dialektika-theta.vercel.app`, sebelum UAT dimulai.

### Lulus

| Yang diuji | Hasil |
| --- | --- |
| Typecheck TypeScript (`tsc --noEmit`) | 0 error |
| Build produksi (`next build`) | Berhasil, 17 halaman |
| Halaman publik `/masuk` | HTTP 200 |
| 7 halaman terlindungi diakses tamu | Semua dialihkan ke `/masuk` |
| `/api/chat`, `/api/nilai`, `/api/models` tanpa login | Ditolak 401 |
| `/api/export` tanpa token / token salah | Ditolak 401 |
| `/api/export` dengan token benar | CSV keluar lengkap |
| Pendaftaran → onboarding → beranda | Berhasil (diuji lewat browser) |
| AI menyapa duluan dengan pertanyaan pemantik | Berhasil |
| Balasan AI atas jawaban siswa | Berhasil, tetap Sokratik |
| Percakapan utuh setelah halaman di-refresh | Berhasil |
| Penilaian menghasilkan skor bervariasi | Berhasil (4,4,3,3,4,4,5) |
| Umpan balik penilaian merujuk isi diskusi | Berhasil |
| Simpan ke Catatan | Berhasil |
| Grafik Perkembangan (tren + radar Facione) | Tampil normal |

### Bug yang ditemukan dan sudah diperbaiki saat pengujian ini

| Temuan | Dampak sebelum diperbaiki |
| --- | --- |
| Model AI di `app_settings` masih ID OpenRouter | Chatbot **tidak pernah** membalas |
| `gemini/gemini-2.5-flash` sudah dihapus dari katalog Sumopod | Chatbot tetap diam walau API key benar |
| Jawaban AI tidak tersimpan (cookie hilang saat streaming) | Percakapan hilang saat refresh; **penilaian membaca transkrip kosong** |
| Stream tidak menutup pada penanda `[DONE]` | Permintaan menggantung **106 detik**; kolom chat terkunci; di Vercel mati kena batas 60 detik |
| Skema penilaian tidak dikirim ke API | AI menjawab `skor_keseluruhan`, kode mencari `skor` → **semua skor jadi 1** |
| `clamp()` menambal nilai kosong dengan 1 | Skor palsu tersimpan tanpa peringatan |
| Middleware mengalihkan seluruh `/api/*` | Ekspor data riset **tidak pernah bisa diakses** |
| `sessions` ↔ `profiles` tidak punya relasi di database | Ekspor CSV gagal total |
| `upsert` pada profiles ditolak RLS | Siswa **tidak bisa menyelesaikan onboarding** |
| Markdown `**tebal**` tampil mentah | Jawaban AI penuh tanda `**` |

### Temuan minor yang BELUM diperbaiki

| Temuan | Dampak | Saran |
| --- | --- | --- |
| Pratinjau di halaman Catatan masih menampilkan `**` mentah | Kosmetik saja | Perlu keputusan: catatan bisa diedit siswa, jadi mungkin memang sebaiknya teks apa adanya |
| Peringatan Next.js: `middleware` sebaiknya diganti `proxy` | Tidak berpengaruh | Ikuti saat naik versi Next.js berikutnya |
| Sesi sangat pendek (1 tanya-jawab) tetap bisa dinilai | Skor jadi sangat rendah dan kurang bermakna untuk penelitian | Pertimbangkan syarat minimal 3 putaran sebelum tombol "Akhiri & Nilai" aktif |

### Yang TIDAK bisa diuji otomatis — wajib manusia

- Apakah pertanyaan AI benar-benar **memancing berpikir** (bagian B3-B6, E5)
- Apakah bahasanya terasa **setara, tidak menggurui** (E3)
- Apakah siswa merasa **lebih paham** (E4)
- Kenyamanan membaca di berbagai ukuran HP (E2)
- Ketepatan materi Biologi/Kimia/Matematika menurut guru mata pelajaran

Empat hal terakhir inilah alasan UAT tetap harus dijalankan oleh manusia,
walaupun seluruh pengujian teknis sudah lulus.
