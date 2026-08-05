-- =============================================================
--  AI DIALEKTIKA — Menyederhanakan Onboarding Siswa
-- =============================================================
--  CARA PAKAI:
--   1. Buka Supabase > SQL Editor > New query
--   2. Copy SELURUH isi file ini, paste, klik "Run"
--   3. Jalankan sekali saja. Aman diulang.
--
--  Perubahan:
--   1. Siswa tidak lagi mengetik KODE SISWA — dibuat otomatis.
--   2. Siswa tidak lagi memilih KELOMPOK — aplikasi ini khusus
--      kelompok eksperimen. Kelompok kontrol memakai AI lain di
--      luar aplikasi ini.
--
--  Setelah ini, onboarding siswa hanya menanyakan: nama, kelas,
--  sekolah, dan persetujuan penelitian.
-- =============================================================


-- =============================================================
--  1. NOMOR URUT UNTUK KODE SISWA
-- =============================================================
--  Kenapa kode tetap ada padahal siswa tidak mengetiknya:
--  ekspor data penelitian (/api/export) SENGAJA tidak memuat nama
--  asli siswa. Kode inilah penggantinya, supaya berkas penelitian
--  bisa dianalisis dan dibagikan tanpa membuka identitas anak di
--  bawah umur. Nama asli tetap terlihat guru di dasbor /guru untuk
--  keperluan absensi.
create sequence if not exists public.kode_siswa_seq start 1;


-- =============================================================
--  2. TRIGGER: isi kode & kelompok secara otomatis
-- =============================================================
create or replace function public.lengkapi_profil_siswa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Hanya untuk siswa yang sudah menyelesaikan onboarding.
  -- Guru dan admin tidak diberi kode maupun kelompok.
  if new.role = 'siswa' and new.onboarded then

    -- Kode dibuat sekali saja. Kalau sudah ada (mis. siswa lama yang
    -- dulu mengetik sendiri), biarkan apa adanya supaya data lama
    -- tidak berubah di tengah penelitian.
    if new.kode_siswa is null then
      new.kode_siswa := 'SIS-' || lpad(nextval('public.kode_siswa_seq')::text, 3, '0');
    end if;

    -- Semua pengguna aplikasi ini adalah kelompok eksperimen.
    if new.kelompok is null then
      new.kelompok := 'eksperimen';
    end if;

  end if;
  return new;
end;
$$;

-- Nama trigger sengaja diawali huruf "b" supaya berjalan SEBELUM
-- "jaga_profil". PostgreSQL menjalankan trigger sejenis menurut urutan
-- abjad namanya. Kalau jaga_profil jalan lebih dulu, kode yang baru
-- dibuat akan dikembalikan ke NULL dan siswa tidak pernah dapat kode.
drop trigger if exists beri_kode_siswa on public.profiles;
create trigger beri_kode_siswa
  before insert or update on public.profiles
  for each row execute function public.lengkapi_profil_siswa();

-- Fungsi trigger tidak boleh dipanggil lewat API.
revoke execute on function public.lengkapi_profil_siswa() from anon, authenticated, public;


-- =============================================================
--  3. Susulan untuk siswa yang sudah terlanjur terdaftar
-- =============================================================
--  Siswa yang sudah onboarding tapi kodenya kosong (mis. dibuat saat
--  uji coba) ikut diberi kode, supaya tidak hilang dari ekspor.
update public.profiles
   set kode_siswa = 'SIS-' || lpad(nextval('public.kode_siswa_seq')::text, 3, '0')
 where role = 'siswa' and onboarded and kode_siswa is null;

update public.profiles
   set kelompok = 'eksperimen'
 where role = 'siswa' and onboarded and kelompok is null;


-- =============================================================
--  SELESAI — cek hasilnya
-- =============================================================
--    select nama, kode_siswa, kelompok, kelas, sekolah
--      from public.profiles where role = 'siswa' order by kode_siswa;
--
--  Semua siswa harus punya kode_siswa dan kelompok 'eksperimen'.
