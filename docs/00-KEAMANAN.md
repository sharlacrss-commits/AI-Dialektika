# 00 — Audit Keamanan & Integritas Data

Tanggal audit: **5 Agustus 2026**
Cakupan: kebijakan akses database (RLS), endpoint API, dan integritas data
penelitian.

Semua temuan di bawah **sudah ditambal** dan **sudah diverifikasi ulang**
dengan mensimulasikan serangan sebagai siswa yang login.

---

## Ringkasan

| # | Temuan | Tingkat | Status |
| --- | --- | --- | --- |
| 1 | Siswa bisa mengangkat dirinya sendiri jadi admin | 🔴 Kritis | ✅ Ditambal |
| 2 | Siswa bisa mengarang skor 10 tanpa berdiskusi | 🔴 Kritis | ✅ Ditambal |
| 3 | Siswa bisa memalsukan pesan seolah dari AI | 🟠 Tinggi | ✅ Ditambal |
| 4 | Siswa bisa menutup sesi tanpa dinilai | 🟡 Sedang | ✅ Ditambal |
| 5 | Kebijakan RLS produksi berbeda dari `schema.sql` | 🔴 Kritis | ✅ Diselaraskan |
| 6 | Token ekspor dikirim lewat URL | 🟡 Sedang | ✅ Diperbaiki |
| 7 | Setelan model bisa dibaca pengunjung anonim | 🟢 Rendah | ✅ Ditambal |
| 8 | Endpoint daftar model terbuka untuk semua yang login | 🟢 Rendah | ✅ Ditambal |
| 9 | Tidak ada rem biaya AI | 🟠 Tinggi | ✅ Ditambahkan |
| 10 | Token ekspor produksi sama dengan contoh di `.env.example` | 🟡 Sedang | ⚠️ **Perlu tindakan Anda** |

---

## Temuan rinci

### 🔴 1. Siswa bisa mengangkat dirinya jadi admin

Kebijakan lama hanya memeriksa **baris** mana yang boleh diubah, tidak
membatasi **kolom**:

```sql
create policy "profil sendiri - update" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
```

Siapa pun yang login cukup membuka konsol browser dan menjalankan:

```js
supabase.from('profiles').update({ role: 'admin' }).eq('id', <id-nya>)
```

lalu ia bisa mengganti model AI penelitian dan membaca profil seluruh
siswa. Bisa juga memindahkan dirinya dari kelompok kontrol ke eksperimen —
merusak data penelitian tanpa jejak.

**Tambalan:** trigger `jaga_kolom_sensitif()` mengembalikan `role`,
`kelompok`, `kode_siswa`, dan `consent` ke nilai lamanya untuk setiap
permintaan yang datang dari browser. Perintah lewat SQL Editor dan
service-role tetap bisa membetulkan data.

> **Catatan penting.** Database produksi ternyata sudah punya trigger
> pengaman buatan tangan (`guard_research_fields`) yang tidak tercatat di
> `supabase/schema.sql`. Artinya celah ini tidak terbuka di produksi, tapi
> **akan terbuka** begitu database dibangun ulang dari berkas repo — mis.
> saat memulihkan cadangan atau membuat project Supabase baru. Sekarang
> tambalannya ada di `004-tambal-keamanan.sql` sehingga ikut terbawa.

### 🔴 2. Siswa bisa mengarang skor

Kebijakan `scores` memberi siswa hak `FOR ALL` (termasuk INSERT), sehingga:

```js
supabase.from('scores').insert({ session_id: ..., skor: 10, ... })
```

berhasil tanpa pernah berdiskusi. Seluruh data penilaian jadi tidak sahih.

**Tambalan:** hak tulis siswa dicabut; `scores` hanya bisa dibaca siswa
untuk sesinya sendiri. Penulisan dilakukan server lewat service-role di
`/api/nilai`, setelah memeriksa kepemilikan sesi dan memastikan ada
minimal 2 jawaban siswa.

### 🟠 3. Siswa bisa memalsukan pesan AI

Kebijakan `messages` juga `FOR ALL`, jadi siswa bisa menyisipkan baris
`peran = 'assistant'` berisi teks karangan. Log chat adalah salah satu
sumber data penelitian ("Observasi Log Chat AI" pada jadwal proposal),
jadi isinya harus benar-benar berasal dari AI.

**Tambalan:** siswa hanya boleh menulis `peran = 'user'`, dan hanya pada
sesi yang masih `berlangsung`. Balasan AI ditulis server.

### 🟡 4. Siswa bisa menutup sesi sendiri

`sessions` `FOR ALL` memungkinkan siswa mengubah `status` jadi `selesai`
tanpa penilaian, sehingga sesi hilang dari hitungan tanpa menghasilkan data.

**Tambalan:** trigger `jaga_status_sesi()` mengunci `status`, `selesai_at`,
`user_id`, dan `mulai_at` dari perubahan lewat browser. Siswa tetap bisa
membuat sesi dan mengubah topik.

### 🔴 5. Kebijakan produksi berbeda dari repo

Ini yang membuat temuan 2 dan 3 sempat **tetap terbuka** setelah tambalan
pertama dipasang. Nama kebijakan di produksi berbeda dari yang ada di
`schema.sql`:

| Di `schema.sql` | Di produksi |
| --- | --- |
| `"nilai di sesi sendiri"` | `"skor sesi sendiri - insert"` |
| `"pesan di sesi sendiri"` | `"pesan sesi sendiri - insert"` |
| `"sesi sendiri"` | `"sesi sendiri - update"` |
| `"profil sendiri: ubah"` | `"profil sendiri - update"` |

Karena `drop policy if exists` memakai nama dari repo, kebijakan lama yang
longgar tidak terhapus dan tetap aktif. Beberapa kebijakan permisif
digabung dengan logika **ATAU**, jadi yang paling longgar yang menang.

**Tambalan:** `004-tambal-keamanan.sql` membuang kedua penamaan lalu
memasang satu set kanonik.

> **Pelajaran:** jangan pernah mengubah kebijakan RLS langsung lewat
> dashboard Supabase. Selalu lewat berkas SQL di `supabase/`, supaya repo
> dan produksi tidak berbeda diam-diam.

### 🟡 6. Token ekspor lewat URL

`/api/export?token=RAHASIA` menaruh token penelitian di query string —
yang tercatat di log akses Vercel, riwayat browser, dan header Referer.
Perbandingannya juga memakai `!==` biasa, yang bocor lewat selisih waktu.

**Perbaikan:** kini mendukung tiga cara, berurutan dari yang paling aman:

1. Login sebagai admin di browser, lalu buka `/api/export`
2. Header `Authorization: Bearer <token>`
3. `?token=` (masih dilayani demi kompatibilitas, tidak dianjurkan)

Perbandingan token memakai `timingSafeEqual`, dan token yang lebih pendek
dari 24 karakter dianggap tidak dipasang.

### 🟢 7–8. Kebocoran kecil

- `app_settings` bisa dibaca role `public` (termasuk pengunjung belum
  login), membocorkan model AI yang dipakai penelitian → dibatasi ke
  pengguna yang sudah login.
- `/api/models` bisa dipanggil siswa mana pun, memakai kuota API Sumopod
  tiap kali dipanggil → dibatasi ke admin.

### 🟠 9. Tidak ada rem biaya

Tidak ada pembatas laju pada `/api/chat`. Satu siswa (atau satu skrip
iseng) bisa menghabiskan saldo Sumopod untuk seluruh penelitian dalam
hitungan menit.

**Tambahan:** maksimal **20 panggilan AI per siswa per menit**. Lewat itu
siswa menerima pesan ramah "Terlalu cepat mengirim pesan". Batasnya bisa
diubah di `lib/ai-log.ts`.

### 🟡 10. Token ekspor produksi = contoh di `.env.example` ⚠️

Nilai `ADMIN_EXPORT_TOKEN` di `.env.local` **sama persis** dengan nilai
yang tertulis sebagai contoh di `.env.example`.

Kabar baiknya: `.env.example` **tidak ikut ter-commit** ke git (sudah
tercakup `.gitignore` pola `.env*`), jadi belum bocor ke publik.

**Yang perlu Anda lakukan:** ganti tokennya dengan yang baru, dan jangan
menaruh nilai asli di berkas contoh.

```bash
# Buat token acak baru
openssl rand -base64 32
```

Lalu perbarui `ADMIN_EXPORT_TOKEN` di `.env.local` **dan** di Environment
Variables Vercel, dan ganti nilai di `.env.example` jadi
`<isi-token-acak-buatanmu>`.

---

## Verifikasi

Serangan berikut disimulasikan langsung di database produksi sebagai siswa
`EKS-001` yang benar-benar login (JWT `authenticated`), di dalam transaksi
yang dibatalkan. Hasil setelah semua tambalan:

| Uji | Hasil |
| --- | --- |
| A. Siswa mengangkat diri jadi admin | ✅ ditolak, role tetap `siswa` |
| B. Siswa mengarang skor 10 | ✅ ditolak |
| C. Siswa memalsukan pesan AI | ✅ ditolak |
| C2. Siswa menulis pesannya sendiri (harus boleh) | ✅ berhasil |
| D. Siswa menutup sesinya sendiri | ✅ ditolak |
| D2. Siswa membuat sesi baru (harus boleh) | ✅ berhasil |
| D3. Siswa membuat catatan (harus boleh) | ✅ berhasil |
| E. Siswa membaca profil siswa lain | ✅ 0 baris |
| F. Siswa membaca chat siswa lain | ✅ 0 baris |
| G. Siswa membaca log performa AI | ✅ 0 baris |
| H. Siswa membaca profilnya sendiri (harus boleh) | ✅ 1 baris |
| I. Siswa membaca setelan model (harus boleh) | ✅ 1 baris |

Diuji juga lewat aplikasi berjalan:

| Uji | Hasil |
| --- | --- |
| Guru membuka `/admin/ai` | ✅ dialihkan ke beranda |
| Guru membuka `/pengaturan` | ✅ "Halaman khusus admin" |
| Guru melihat siswa sekolah lain | ✅ tidak muncul di daftar |
| `/api/export` tanpa token | ✅ 401 |
| `/api/export` dengan token salah | ✅ 401 |
| `/api/export` dengan header Bearer benar | ✅ CSV keluar |

Cara mengulang uji RLS ada di bagian akhir
`supabase/004-tambal-keamanan.sql`.

---

## Yang masih jadi tanggung jawab manusia

Hal-hal berikut **tidak bisa** ditambal oleh kode:

| Risiko | Cara mengurangi |
| --- | --- |
| Siswa memilih sendiri kelompoknya saat onboarding | Bagikan kode & kelompok lewat lembar tercetak; cocokkan hasilnya lewat `/guru` sebelum intervensi dimulai |
| Siswa saling meminjam akun | Cocokkan `kode_siswa` dengan daftar hadir |
| `SUPABASE_SERVICE_ROLE_KEY` bocor | Jangan pernah menaruhnya di kode sisi browser atau membagikannya di chat. Kunci ini melewati **semua** RLS |
| Data pribadi di transkrip | Perlakukan sebagai data rahasia; samarkan kalau dikutip di laporan |
