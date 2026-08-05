# AI Dialektika

Teman belajar berbasis AI untuk siswa SMA. Alih-alih memberi jawaban, ia
memancing siswa berpikir (metode Sokratik), lalu menilai keterampilan
berpikir kritis memakai rubrik Facione.

Next.js 16 · React 19 · Supabase (database + auth) · Sumopod (AI, kompatibel OpenAI)

---

## Cara menjalankan (urut, jangan dilompati)

### 1. Pasang Node.js

Cek dulu apakah sudah terpasang — buka Terminal, ketik:

```bash
node -v
```

Kalau muncul `command not found`, unduh installer **LTS** dari
<https://nodejs.org> lalu pasang. **Tutup dan buka lagi Terminal / VS Code**
setelah selesai, lalu cek ulang `node -v`.

### 2. Pasang dependency

```bash
npm install
```

Sekitar 1–3 menit. Setelah ini folder `node_modules/` muncul dan semua
garis merah di VS Code hilang.

### 3. Siapkan database Supabase

1. Buat project gratis di <https://supabase.com>.
2. Buka **SQL Editor → New query**.
3. Jalankan lima berkas ini **berurutan** (copy isinya, paste, Run):

   | Urutan | Berkas | Isinya |
   | --- | --- | --- |
   | 1 | [`supabase/schema.sql`](supabase/schema.sql) | Tabel dasar |
   | 2 | [`supabase/002-lampiran.sql`](supabase/002-lampiran.sql) | Unggah foto soal & PDF |
   | 3 | [`supabase/003-role-guru-dan-tracking.sql`](supabase/003-role-guru-dan-tracking.sql) | Role guru, pencatatan performa AI, penilaian manual |
   | 4 | [`supabase/004-tambal-keamanan.sql`](supabase/004-tambal-keamanan.sql) | **Wajib.** Menutup celah keamanan — lihat [docs/00-KEAMANAN.md](docs/00-KEAMANAN.md) |
   | 5 | [`supabase/005-sederhanakan-onboarding.sql`](supabase/005-sederhanakan-onboarding.sql) | Kode siswa otomatis, kelompok kontrol dihapus dari aplikasi |

4. Buka **Authentication → Sign In / Providers → Email**, matikan
   **Confirm email**, klik Save. (Kalau tidak, siswa harus verifikasi email
   dulu sebelum bisa masuk.)
5. Untuk tombol **Masuk dengan Google**, ikuti
   [docs/01-PEMBUATAN-AKUN.md](docs/01-PEMBUATAN-AKUN.md) bagian 1.

### 4. Isi kunci di `.env.local`

Buka file `.env.local` di root project, ganti setiap `ISI_DI_SINI`:

| Variabel | Ambil di mana |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API Keys |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem, bagian **anon / public** |
| `SUPABASE_SERVICE_ROLE_KEY` | idem, bagian **service_role** (rahasia) |
| `SUMOPOD_API_KEY` | <https://sumopod.com> → buat API Key |

File `.env.local` sudah masuk `.gitignore`, jadi aman dan tidak ikut
ter-upload ke GitHub.

### 5. Jalankan

```bash
npm run dev
```

Buka <http://localhost:3000>.

> Setiap kali `.env.local` diubah, **restart** `npm run dev` — Next.js hanya
> membaca file itu saat start.

---

## Tiga role

| Role | Bisa apa | Halaman |
| --- | --- | --- |
| `siswa` | Berdiskusi, dinilai AI, menulis catatan | `/beranda` |
| `guru` | Melihat siswa **di sekolahnya**, membaca transkrip, menilai manual, rekap AI vs guru | `/guru` |
| `admin` | Semua di atas lintas sekolah + performa AI + setelan model + ekspor data | `/admin/ai` |

Role diberikan lewat SQL Editor setelah orangnya mendaftar sendiri:

```sql
-- Guru. Kolom sekolah WAJIB diisi & harus sama persis dengan milik siswa.
update public.profiles
   set role = 'guru', sekolah = 'SMA Pradita Dirgantara'
 where id = (select id from auth.users where email = 'guru@contoh.com');

-- Admin / peneliti
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'emailkamu@contoh.com');
```

Panduan lengkap: [docs/01-PEMBUATAN-AKUN.md](docs/01-PEMBUATAN-AKUN.md).

---

## Ekspor data penelitian

Login sebagai admin lalu buka `/api/export`, atau dari terminal:

```bash
curl -H "Authorization: Bearer <ADMIN_EXPORT_TOKEN>" \
     https://<domain>/api/export -o data-riset.csv
```

Menghasilkan CSV: kode siswa, kelompok, kelas, sekolah, materi, durasi,
jumlah pesan, skor Facione dari AI, skor manual guru, dan selisihnya.

> Cara lama `?token=...` masih jalan tapi tidak dianjurkan — query string
> tercatat di log akses dan riwayat browser.

---

## Dokumentasi

Panduan operasional penelitian ada di [`docs/`](docs/README.md):
keamanan, pembuatan akun, rencana penilaian, dan pengujian performa AI.

---

## Kalau chatbot tidak membalas

Pesan error di layar sekarang menyebut penyebabnya. Padanannya:

| Pesan | Artinya | Perbaikan |
| --- | --- | --- |
| `SUMOPOD_API_KEY belum diisi` | env kosong | Isi `.env.local`, restart `npm run dev` |
| `API key Sumopod ditolak` | key salah/kedaluwarsa | Buat key baru di sumopod.com |
| `Saldo/kredit Sumopod habis` | kredit nol | Top up di sumopod.com |
| `Terlalu banyak permintaan` | kena rate limit | Tunggu sebentar |
| `Sesi login habis` | cookie auth kedaluwarsa | Muat ulang, masuk lagi |
| Terjebak di halaman onboarding | tabel `profiles` belum ada | Jalankan `supabase/schema.sql` |

Cek juga log di Terminal tempat `npm run dev` berjalan — error dari Sumopod
dicatat dengan awalan `[chat]`.

---

## Deploy ke Vercel

1. Push project ke GitHub.
2. Import repo di <https://vercel.com>.
3. **Settings → Environment Variables → Import .env**, paste isi
   `.env.local` yang sudah terisi. Centang Production, Preview, Development.
4. Deploy.

Database Supabase-nya sama untuk lokal maupun produksi — cukup dijalankan sekali.
