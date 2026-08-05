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

> Berkas 3 dan 4 **sudah dijalankan** di database produksi
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

Siswa mendaftar sendiri, lalu mengisi onboarding. Yang perlu disiapkan
guru **sebelum** hari uji coba:

### a. Daftar kode siswa

Kode siswa harus **unik** dan **tidak menyebut nama asli** — ini yang
menjaga kerahasiaan data penelitian. Pola yang dipakai:

| Kelompok | Pola | Contoh |
| --- | --- | --- |
| Eksperimen | `EKS-###` | EKS-001 … EKS-030 |
| Kontrol | `KTR-###` | KTR-001 … KTR-030 |

Siapkan sebagai tabel di spreadsheet: **kode siswa → nama asli**.
Simpan terpisah dari aplikasi. Inilah satu-satunya penghubung antara
data penelitian dan identitas siswa.

### b. Yang dibagikan ke siswa

Cukup selembar berisi:

```
Alamat    : https://<domain>/masuk
Kode kamu : EKS-014
Kelompok  : eksperimen
Sekolah   : SMA Pradita Dirgantara     <- tulis PERSIS seperti ini
Kelas     : X IPA 2
```

> Tulis nama sekolah dalam huruf besar-kecil yang sudah jadi, jangan
> biarkan siswa mengetik sendiri versinya. Salah ketik sekolah = siswa
> itu tidak muncul di dasbor guru.

### c. Yang otomatis dikunci sistem

Setelah siswa menekan **Mulai Belajar**, tiga hal ini **tidak bisa
diubah lagi** dari aplikasi (dijaga di sisi database):

- `kelompok` — supaya siswa tidak berpindah kelompok di tengah penelitian
- `kode_siswa` — supaya datanya tidak tertukar
- `role` — supaya siswa tidak bisa mengangkat dirinya jadi admin

Kalau ada yang salah isi, hanya bisa dibetulkan lewat SQL Editor:

```sql
update public.profiles set kode_siswa = 'EKS-014'
 where id = (select id from auth.users where email = 'email-siswa@contoh.com');
```

---

## 5. Catatan penting soal kelompok kontrol

Proposal menyebut kelompok kontrol memakai **AI konvensional (ChatGPT)**.
Aplikasi ini sekarang mendukung **dua cara**, pilih salah satu dan
konsisten:

**Cara A — kontrol pakai ChatGPT di luar aplikasi (sesuai proposal)**
Jangan buatkan akun untuk siswa kontrol. Log chat kelompok kontrol
dikumpulkan manual (tangkapan layar / ekspor ChatGPT).
→ Kelebihan: persis seperti proposal.
→ Kekurangan: log chat tidak seragam, dan variabel lain ikut berbeda
   (model, bahasa, antarmuka), sehingga selisih skor tidak murni berasal
   dari ada/tidaknya gesekan kognitif.

**Cara B — kontrol pakai aplikasi ini dengan persona penjawab biasa**
Buatkan akun, pilih kelompok `kontrol` saat onboarding. Aplikasi otomatis
memakai persona AI penjawab langsung (lihat `SYSTEM_KONVENSIONAL` di
`lib/prompts.ts`), bukan persona Sokratik.
→ Kelebihan: model, bahasa, antarmuka, dan cara penilaian identik; yang
   berbeda **hanya** persona AI-nya. Ini yang secara metodologis paling
   bersih untuk uji-t. Log chat kedua kelompok juga seragam.
→ Kekurangan: menyimpang dari kalimat proposal ("ChatGPT"), jadi perlu
   dijelaskan di laporan sebagai penyesuaian metode.

**Rekomendasi: Cara B**, dan tulis di laporan bahwa "AI konvensional"
dioperasionalkan sebagai model bahasa yang sama tanpa instruksi Sokratik,
justru untuk mengontrol variabel pengganggu.

---

## 6. Ceklis H-1 uji coba

- [ ] Empat berkas SQL sudah dijalankan
- [ ] Login Google sudah diuji dari HP, bukan cuma laptop
- [ ] Konfirmasi email sudah dimatikan di Supabase
- [ ] 1 akun admin + 1 akun guru sudah jadi dan bisa masuk
- [ ] Kolom `sekolah` guru sama persis dengan yang akan diisi siswa
- [ ] Daftar kode siswa sudah dicetak/dibagikan
- [ ] Saldo Sumopod dicek (lihat perkiraan biaya di
      [03-PENGUJIAN-PERFORMA-AI.md](03-PENGUJIAN-PERFORMA-AI.md))
- [ ] Sudah mencoba satu sesi penuh sebagai siswa dari HP
