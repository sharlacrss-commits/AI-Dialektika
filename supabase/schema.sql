-- =============================================================
--  AI DIALEKTIKA — Skema Database Supabase
-- =============================================================
--  CARA PAKAI:
--   1. Buka https://supabase.com  ->  project kamu
--   2. Menu kiri: SQL Editor  ->  New query
--   3. Copy SELURUH isi file ini, paste, klik "Run"
--   4. Jalankan sekali saja. Aman diulang (pakai IF NOT EXISTS).
--
--  Setelah ini, matikan konfirmasi email supaya siswa bisa
--  langsung masuk:  Authentication > Sign In / Providers >
--  Email > matikan "Confirm email"  -> Save
-- =============================================================


-- =============================================================
--  1. TABEL
-- =============================================================

-- --- profiles: data siswa, 1 baris per akun -----------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text,
  kode_siswa  text unique,
  kelompok    text check (kelompok in ('eksperimen', 'kontrol')),
  kelas       text,
  sekolah     text,
  consent     boolean not null default false,
  consent_at  timestamptz,
  role        text not null default 'siswa' check (role in ('siswa', 'admin')),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- --- sessions: satu sesi belajar ----------------------------
-- CATATAN: user_id menunjuk ke profiles(id), BUKAN auth.users.
-- Ini wajib supaya query gabungan  sessions.select("...profiles(...)")
-- di /api/export bisa dikenali oleh PostgREST.
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  mapel       text not null,
  topik       text,
  status      text not null default 'berlangsung'
              check (status in ('berlangsung', 'selesai')),
  mulai_at    timestamptz not null default now(),
  selesai_at  timestamptz
);

create index if not exists sessions_user_idx on public.sessions (user_id, mulai_at desc);

-- --- messages: isi percakapan -------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  peran       text not null check (peran in ('user', 'assistant')),
  isi         text not null,
  is_pemantik boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists messages_session_idx on public.messages (session_id, created_at);

-- --- scores: hasil penilaian AI -----------------------------
-- session_id UNIQUE itu WAJIB: /api/nilai memakai
-- upsert(..., { onConflict: "session_id" }).
create table if not exists public.scores (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null unique references public.sessions(id) on delete cascade,
  skor          int not null check (skor between 1 and 10),
  interpretasi  int not null check (interpretasi  between 1 and 10),
  analisis      int not null check (analisis      between 1 and 10),
  evaluasi      int not null check (evaluasi      between 1 and 10),
  inferensi     int not null check (inferensi     between 1 and 10),
  eksplanasi    int not null check (eksplanasi    between 1 and 10),
  regulasi_diri int not null check (regulasi_diri between 1 and 10),
  kelebihan     text not null default '',
  kekurangan    text not null default '',
  saran         text not null default '',
  created_at    timestamptz not null default now()
);

-- --- notes: catatan siswa -----------------------------------
create table if not exists public.notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  judul             text not null default '',
  isi               text not null default '',
  mapel             text,
  source_session_id uuid references public.sessions(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);

-- --- app_settings: model AI yang dipakai (1 baris) ----------
create table if not exists public.app_settings (
  id             text primary key,
  chat_model     text not null default 'gemini/gemini-2.5-flash',
  fallback_model text not null default 'gpt-4o-mini',
  updated_at     timestamptz not null default now()
);

-- Baris tunggal 'global' yang dibaca /api/chat dan /api/nilai.
insert into public.app_settings (id, chat_model, fallback_model)
values ('global', 'gemini/gemini-2.5-flash', 'gpt-4o-mini')
on conflict (id) do nothing;


-- =============================================================
--  2. TRIGGER: buat profil otomatis saat user mendaftar
-- =============================================================
--  PENTING. Halaman /onboarding meng-update baris profiles.
--  Tanpa trigger ini barisnya tidak pernah ada, sehingga
--  siswa terjebak di halaman onboarding terus-menerus.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama)
  values (new.id, new.raw_user_meta_data ->> 'nama')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Susulan untuk akun yang sudah terlanjur dibuat sebelum
-- trigger ini dipasang.
insert into public.profiles (id, nama)
select u.id, u.raw_user_meta_data ->> 'nama'
from auth.users u
on conflict (id) do nothing;


-- =============================================================
--  3. ROW LEVEL SECURITY (RLS)
-- =============================================================
--  Tanpa ini, data satu siswa bisa dibaca siswa lain.

alter table public.profiles     enable row level security;
alter table public.sessions     enable row level security;
alter table public.messages     enable row level security;
alter table public.scores       enable row level security;
alter table public.notes        enable row level security;
alter table public.app_settings enable row level security;

-- Bantu policy mengenali admin tanpa memicu rekursi RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- --- profiles ------------------------------------------------
drop policy if exists "profil sendiri: baca"  on public.profiles;
drop policy if exists "profil sendiri: ubah"  on public.profiles;
drop policy if exists "profil sendiri: buat"  on public.profiles;

create policy "profil sendiri: baca" on public.profiles
  for select using (id = auth.uid());

create policy "profil sendiri: ubah" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Diperlukan agar upsert di /onboarding tetap jalan seandainya
-- trigger di atas belum sempat membuat barisnya.
create policy "profil sendiri: buat" on public.profiles
  for insert with check (id = auth.uid());

-- --- sessions ------------------------------------------------
drop policy if exists "sesi sendiri" on public.sessions;
create policy "sesi sendiri" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- messages (ikut kepemilikan sesi) ------------------------
drop policy if exists "pesan di sesi sendiri" on public.messages;
create policy "pesan di sesi sendiri" on public.messages
  for all
  using (
    exists (select 1 from public.sessions s
            where s.id = messages.session_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.sessions s
            where s.id = messages.session_id and s.user_id = auth.uid())
  );

-- --- scores (ikut kepemilikan sesi) --------------------------
drop policy if exists "nilai di sesi sendiri" on public.scores;
create policy "nilai di sesi sendiri" on public.scores
  for all
  using (
    exists (select 1 from public.sessions s
            where s.id = scores.session_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.sessions s
            where s.id = scores.session_id and s.user_id = auth.uid())
  );

-- --- notes ---------------------------------------------------
drop policy if exists "catatan sendiri" on public.notes;
create policy "catatan sendiri" on public.notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- app_settings: semua yang login boleh baca, admin boleh ubah
drop policy if exists "setelan: baca"  on public.app_settings;
drop policy if exists "setelan: tulis" on public.app_settings;

create policy "setelan: baca" on public.app_settings
  for select to authenticated using (true);

create policy "setelan: tulis" on public.app_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- =============================================================
--  SELESAI
-- =============================================================
--  Menjadikan akun kamu admin (supaya bisa buka /pengaturan):
--  ganti emailnya lalu jalankan baris di bawah.
--
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'emailkamu@contoh.com');
