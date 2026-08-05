# 01 — Rencana Pembuatan Akun

Dokumen ini dipakai saat menyiapkan akun untuk uji coba dan untuk masa
intervensi penelitian. Urutannya sengaja dibuat berurutan — jangan
melompat, karena langkah 1 dan 2 menentukan apakah dasbor guru bisa
melihat siswanya.

---

## 0. Sebelum apa pun: jalankan berkas SQL

Buka **Supabase → SQL Editor → New query**, lalu jalankan berurutan:

| Urutan | Berkas | Isinya |
| --- | --- | --- |
| 1 | `supabase/schema.sql` | Tabel dasar (hanya untuk database baru) |
| 2 | `supabase/002-lampiran.sql` | Unggah foto soal & PDF |
| 3 | `supabase/003-role-guru-dan-tracking.sql` | Role guru, pencatatan performa AI, penilaian manual |
| 4 | `supabase/004-tambal-keamanan.sql` | **Wajib.** Menutup celah keamanan — lihat [00-KEAMANAN.md](00-KEAMANAN.md) |
| 5 | `supabase/005-sederhanakan-onboarding.sql` | Kode siswa otomatis, kelompok kontrol dihapus |

> Berkas 3, 4, dan 5 **sudah dijalankan** di database produksi
> (`hbqqojknyltjfneilcrv`) pada 5 Agustus 2026. Berkasnya tetap disimpan
> supaya database baru (atau pemulihan cadangan) bisa disamakan.

---

## 1. Menyalakan login Google

Sudah ada tombol **"Masuk dengan Google"** di halaman `/masuk`. Supaya
berfungsi, tiga hal ini harus cocok satu sama lain:

### a. Di Google Cloud Console

1. Buka <https://console.cloud.google.com> → **APIs & Services → Credentials**.
2. Buat **OAuth client ID** jenis **Web application**.
3. Isi **Authorized redirect URIs** dengan URL callback Supabase:
   ```
   https://hbqqojknyltjfneilcrv.supabase.co/auth/v1/callback
   ```
   Ini URL **Supabase**, bukan URL website. Kesalahan paling sering di sini.
4. Salin **Client ID** dan **Client Secret**.

### b. Di Supabase

1. **Authentication → Sign In / Providers → Google** → aktifkan.
2. Tempel Client ID dan Client Secret dari langkah a.
3. **Authentication → URL Configuration → Redirect URLs**, tambahkan
   dua-duanya:
   ```
   http://localhost:3000/auth/callback
   https://<domain-produksi-kamu>/auth/callback
   ```
4. **Authentication → Providers → Email** → matikan **Confirm email**,
   supaya siswa yang mendaftar pakai email/sandi bisa langsung masuk.

### c. Uji

Buka `/masuk` → **Masuk dengan Google**. Kalau muncul
`redirect_uri_mismatch`, yang salah adalah langkah a.3.
Kalau setelah memilih akun Google halaman kembali ke `/masuk` dengan
pesan galat, yang salah adalah langkah b.3.

---

## 2. Membuat akun GURU

Guru **mendaftar sendiri** lewat halaman `/masuk` (boleh Google, boleh
email/sandi). Setelah itu, jalankan di SQL Editor:

```sql
update public.profiles
   set role = 'guru',
       sekolah = 'SMA Pradita Dirgantara'
 where id = (select id from auth.users where email = 'email-guru@contoh.com');
```

> **Kolom `sekolah` adalah kuncinya.** Guru hanya bisa melihat siswa yang
> nama sekolahnya sama. Besar-kecil huruf dan spasi di pinggir diabaikan,
> tapi ejaannya harus sama persis. `SMA Pradita Dirgantara` ≠
> `SMAN Pradita Dirgantara`.

Setelah itu guru login ulang, mengisi onboarding versi guru (nama, kelas
yang diampu, sekolah), lalu langsung masuk ke dasbor `/guru`.

**Apa yang bisa dilakukan guru:**

| Bisa | Tidak bisa |
| --- | --- |
| Melihat daftar siswa di sekolahnya | Melihat siswa sekolah lain |
| Membaca transkrip diskusi siswa | Mengubah nilai AI |
| Mengisi penilaian manual | Mengganti model AI |
| Melihat rekap AI vs guru | Mengekspor data mentah |

---

## 3. Membuat akun ADMIN / PENELITI

Sama seperti guru, tapi rolenya `admin`:

```sql
update public.profiles
   set role = 'admin',
       sekolah = 'SMA Pradita Dirgantara'
 where id = (select id from auth.users where email = 'email-peneliti@contoh.com');
```

Admin bisa semua yang guru bisa, **lintas sekolah**, ditambah:
halaman **Performa AI** (`/admin/ai`), **Pengaturan** model AI, dan
**ekspor CSV** (`/api/export`).

Minimal buat **satu** akun admin. Buat akun admin kedua sebagai cadangan
kalau yang pertama tidak bisa diakses.

---

## 4. Membuat akun SISWA

Siswa mendaftar sendiri, lalu mengisi onboarding. Formnya sengaja dibuat
sependek mungkin — hanya **empat** isian:

| Isian | Catatan |
| --- | --- |
| Nama lengkap | Tulis seperti di absen kelas, ini yang dipakai guru mencocokkan kehadiran |
| Kelas | mis. X IPA 2 |
| Sekolah | **Harus sama persis** dengan yang diisi guru |
| Persetujuan riset | Wajib dicentang |

Siswa **tidak lagi** mengetik kode siswa maupun memilih kelompok.
Keduanya diisi otomatis oleh database.

### a. Kode siswa dibuat otomatis

Setiap siswa yang menyelesaikan onboarding langsung mendapat kode
berurutan: `SIS-001`, `SIS-002`, dan seterusnya. Siswa sendiri tidak
perlu tahu kodenya.

**Kenapa kodenya tetap ada padahal tidak diketik siapa pun:** ekspor data
penelitian (`/api/export`) **sengaja tidak memuat nama asli siswa**. Kode
inilah penggantinya, supaya berkas penelitian bisa dianalisis, dibagikan
ke pembimbing, atau dilampirkan ke laporan tanpa membuka identitas anak
di bawah umur.

Pembagian tugasnya:

| Tempat | Yang ditampilkan | Untuk apa |
| --- | --- | --- |
| Dasbor guru `/guru` | **Nama asli** + kode | Absensi, memantau siapa yang aktif |
| Ekspor CSV | **Kode saja** | Analisis data, lampiran laporan |

Kalau butuh memasangkan lembar pre-test/post-test (yang bernama) dengan
data sesi (yang berkode), buka `/guru` — di situ nama dan kode berdampingan.

### b. Yang dibagikan ke siswa

Cukup selembar berisi:

```
Alamat  : https://<domain>/masuk
Sekolah : SMA Pradita Dirgantara     <- tulis PERSIS seperti ini
Kelas   : X IPA 2
Nama    : tulis nama lengkap seperti di absen
```

> Tulis nama sekolah dalam huruf besar-kecil yang sudah jadi, jangan
> biarkan siswa mengetik sendiri versinya. Salah ketik sekolah = siswa
> itu tidak muncul di dasbor guru.

### c. Yang otomatis dikunci sistem

Setelah siswa menekan **Mulai Belajar**, hal-hal ini **tidak bisa diubah
lagi** dari aplikasi (dijaga trigger di database):

- `role` — siswa tidak bisa mengangkat dirinya jadi admin
- `kode_siswa` — supaya data penelitian tidak tertukar
- `kelompok` — terkunci di `eksperimen`
- `consent` — persetujuan yang sudah diberikan tidak hilang diam-diam

Kalau ada yang salah isi, hanya bisa dibetulkan lewat SQL Editor:

```sql
update public.profiles set kelas = 'X IPA 3'
 where id = (select id from auth.users where email = 'email-siswa@contoh.com');
```

---

## 5. Kelompok kontrol

Aplikasi ini **khusus kelompok eksperimen**. Semua yang punya akun di
sini otomatis tercatat sebagai `eksperimen`.

Kelompok kontrol **tidak dibuatkan akun** dan bebas memakai apa pun
selain AI Dialektika (ChatGPT, Gemini, atau cara belajar biasa), sesuai
proposal.

**Konsekuensi yang perlu disadari saat menulis laporan:** karena kelompok
kontrol memakai alat di luar aplikasi, log chat mereka tidak terkumpul
otomatis dan variabel lain ikut berbeda (model AI, antarmuka, bahasa).
Jadi selisih skor pre-test → post-test antara dua kelompok tidak bisa
diklaim **murni** berasal dari ada/tidaknya gesekan kognitif — ada faktor
lain yang tidak terkontrol. Sebutkan ini sebagai keterbatasan penelitian.

Untuk memperkuat, catat juga dari kelompok kontrol:
- alat AI apa yang mereka pakai (kuesioner singkat), dan
- berapa lama mereka belajar,

supaya paling tidak lama belajarnya bisa dibandingkan setara.

---

## 6. Ceklis H-1 uji coba

- [ ] Lima berkas SQL sudah dijalankan
- [ ] Login Google sudah diuji dari HP, bukan cuma laptop
- [ ] Konfirmasi email sudah dimatikan di Supabase
- [ ] 1 akun admin + 1 akun guru sudah jadi dan bisa masuk
- [ ] Kolom `sekolah` guru sama persis dengan yang akan diisi siswa
- [ ] Lembar berisi alamat situs + ejaan nama sekolah sudah dibagikan
- [ ] Saldo Sumopod dicek (lihat perkiraan biaya di
      [03-PENGUJIAN-PERFORMA-AI.md](03-PENGUJIAN-PERFORMA-AI.md))
- [ ] Sudah mencoba satu sesi penuh sebagai siswa dari HP
