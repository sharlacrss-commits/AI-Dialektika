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
3. Copy seluruh isi [`supabase/schema.sql`](supabase/schema.sql), paste, klik **Run**.
4. Buka **Authentication → Sign In / Providers → Email**, matikan
   **Confirm email**, klik Save. (Kalau tidak, siswa harus verifikasi email
   dulu sebelum bisa masuk.)

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

## Menjadikan akunmu admin

Halaman **Pengaturan** (ganti model AI) dan endpoint `/api/export` hanya
untuk admin. Setelah mendaftar lewat aplikasi, jalankan di SQL Editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'emailkamu@contoh.com');
```

---

## Ekspor data penelitian

```
/api/export?token=<isi ADMIN_EXPORT_TOKEN>
```

Menghasilkan CSV: kode siswa, kelompok (eksperimen/kontrol), kelas, sekolah,
mapel, status sesi, dan seluruh skor Facione.

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
