-- =============================================================
--  AI DIALEKTIKA — Tambahan: Unggah Lampiran (gambar & PDF)
-- =============================================================
--  CARA PAKAI:
--   1. Buka Supabase > SQL Editor > New query
--   2. Copy SELURUH isi file ini, paste, klik "Run"
--   3. Jalankan sekali saja. Aman diulang.
--
--  Jalankan ini SEBELUM memakai fitur lampiran, kalau tidak
--  tombol lampirkan akan gagal menyimpan.
-- =============================================================


-- =============================================================
--  1. KOLOM LAMPIRAN DI TABEL messages
-- =============================================================
alter table public.messages
  add column if not exists lampiran_path text,
  add column if not exists lampiran_nama text,
  add column if not exists lampiran_tipe text;

comment on column public.messages.lampiran_path is
  'Lokasi file di Storage bucket "lampiran". Format: {user_id}/{session_id}/{nama-unik}';
comment on column public.messages.lampiran_nama is
  'Nama asli file saat diunggah siswa, untuk ditampilkan di layar.';
comment on column public.messages.lampiran_tipe is
  'MIME type, mis. image/png atau application/pdf.';


-- =============================================================
--  2. BUCKET PENYIMPANAN
-- =============================================================
--  private = tidak bisa dibuka sembarang orang lewat URL tebakan.
--  Aplikasi membukanya lewat signed URL berumur pendek.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lampiran',
  'lampiran',
  false,
  10485760,  -- 10 MB per file
  array['image/png','image/jpeg','image/webp','image/heic','application/pdf']
)
on conflict (id) do update
  set file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = false;


-- =============================================================
--  3. IZIN AKSES FILE (RLS pada storage.objects)
-- =============================================================
--  Aturannya: siswa hanya boleh menyentuh file di dalam folder
--  yang namanya sama dengan user id miliknya sendiri.
--  Jadi file siswa A tidak bisa dibuka siswa B.

drop policy if exists "lampiran: unggah milik sendiri" on storage.objects;
drop policy if exists "lampiran: baca milik sendiri"   on storage.objects;
drop policy if exists "lampiran: hapus milik sendiri"  on storage.objects;

create policy "lampiran: unggah milik sendiri" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lampiran'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lampiran: baca milik sendiri" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lampiran'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lampiran: hapus milik sendiri" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lampiran'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- =============================================================
--  SELESAI
-- =============================================================
--  Cek hasilnya:
--    select column_name from information_schema.columns
--    where table_name = 'messages' and column_name like 'lampiran%';
--  Harus muncul 3 baris.
