-- =============================================================
--  AI DIALEKTIKA — Tambahan: Role Guru & Pelacakan Performa AI
-- =============================================================
--  CARA PAKAI:
--   1. Buka Supabase > SQL Editor > New query
--   2. Copy SELURUH isi file ini, paste, klik "Run"
--   3. Jalankan sekali saja. Aman diulang.
--
--  Isi file ini:
--   1. Role baru 'guru' (di samping 'siswa' dan 'admin')
--   2. Tabel ai_calls        -> performa TEKNIS AI (latensi, token, gagal)
--   3. Tabel message_feedback-> KUALITAS jawaban AI menurut siswa
--   4. Tabel manual_scores   -> penilaian MANUAL guru, pembanding skor AI
--   5. RLS supaya guru hanya melihat siswa di sekolahnya sendiri
-- =============================================================


-- =============================================================
--  1. ROLE 'guru'
-- =============================================================
--  Check constraint lama hanya mengizinkan 'siswa' dan 'admin'.
--  Harus dibuang dulu, baru dipasang yang baru.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('siswa', 'guru', 'admin'));

-- Guru & admin tidak ikut penelitian, jadi kolom kelompok boleh kosong.
-- (Constraint kelompok memang sudah nullable, tidak perlu diubah.)

comment on column public.profiles.role is
  'siswa = pengguna aplikasi. guru = memantau siswa di sekolah yang sama & menilai manual. admin = semua akses + setelan model AI.';


-- =============================================================
--  2. FUNGSI BANTU untuk RLS
-- =============================================================
--  Semua security definer supaya tidak memicu rekursi RLS saat
--  policy di profiles membaca tabel profiles itu sendiri.

create or replace function public.is_guru()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'guru'
  );
$$;

-- Sekolah milik akun yang sedang login, dinormalkan (huruf kecil, tanpa
-- spasi pinggir) supaya "SMAN 1 Bogor" dan "sman 1 bogor " dianggap sama.
create or replace function public.sekolah_saya()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(lower(trim(coalesce(sekolah, ''))), '')
  from public.profiles
  where id = auth.uid();
$$;

-- Inti aturan pemantauan: siapa yang boleh melihat data siswa tertentu.
--   admin -> semua siswa
--   guru  -> hanya siswa di sekolah yang sama (dan sekolahnya terisi)
--   siswa -> tidak ada (policy "milik sendiri" yang mengurus)
create or replace function public.boleh_pantau(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or (
      public.is_guru()
      and public.sekolah_saya() is not null
      and exists (
        select 1 from public.profiles p
        where p.id = target
          and p.role = 'siswa'
          and nullif(lower(trim(coalesce(p.sekolah, ''))), '') = public.sekolah_saya()
      )
    );
$$;


-- Keempat fungsi di atas HANYA boleh dipanggil oleh yang sudah login.
-- Tanpa revoke ini, PostgREST mengeksposnya sebagai /rest/v1/rpc/... yang
-- bisa dipanggil pengunjung anonim.
revoke execute on function public.is_admin()         from anon, public;
revoke execute on function public.is_guru()          from anon, public;
revoke execute on function public.sekolah_saya()     from anon, public;
revoke execute on function public.boleh_pantau(uuid) from anon, public;
grant  execute on function public.is_admin()         to authenticated;
grant  execute on function public.is_guru()          to authenticated;
grant  execute on function public.sekolah_saya()     to authenticated;
grant  execute on function public.boleh_pantau(uuid) to authenticated;


-- =============================================================
--  3. TABEL ai_calls — performa TEKNIS AI
-- =============================================================
--  Satu baris per panggilan ke Sumopod. Dipakai untuk menjawab:
--  "AI-nya cepat atau lambat? sering gagal? boros token?"
create table if not exists public.ai_calls (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.profiles(id) on delete set null,
  session_id        uuid references public.sessions(id) on delete set null,

  -- 'chat'  = balasan diskusi
  -- 'nilai' = penilaian rubrik Facione di akhir sesi
  jenis             text not null check (jenis in ('chat', 'nilai')),

  model_diminta     text,                     -- model utama yang dicoba lebih dulu
  model             text,                     -- model yang AKHIRNYA menjawab
  pakai_fallback    boolean not null default false,

  status            text not null check (status in ('ok', 'error')),
  http_status       int,

  ttfb_ms           int,   -- sampai token pertama sampai di layar (yang dirasakan siswa)
  latensi_ms        int,   -- total sampai jawaban selesai

  prompt_tokens     int,
  completion_tokens int,
  total_tokens      int,

  jumlah_lampiran   int not null default 0,
  pesan_error       text,
  created_at        timestamptz not null default now()
);

create index if not exists ai_calls_waktu_idx  on public.ai_calls (created_at desc);
create index if not exists ai_calls_sesi_idx   on public.ai_calls (session_id);
create index if not exists ai_calls_status_idx on public.ai_calls (status, created_at desc);

comment on column public.ai_calls.ttfb_ms is
  'Time To First Byte: jeda dari siswa menekan kirim sampai huruf pertama muncul. Ini angka yang paling terasa oleh siswa.';
comment on column public.ai_calls.latensi_ms is
  'Total waktu sampai jawaban selesai mengalir.';


-- =============================================================
--  4. TABEL message_feedback — KUALITAS jawaban AI
-- =============================================================
--  Siswa menekan jempol pada jawaban AI. Tujuannya bukan sekadar
--  "suka/tidak suka", tapi menguji apakah AI benar-benar MEMANCING
--  berpikir, bukan langsung memberi jawaban.
create table if not exists public.message_feedback (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  membantu    boolean not null,
  alasan      text check (alasan in (
                'memancing_berpikir',   -- positif: sesuai tujuan aplikasi
                'penjelasannya_jelas',  -- positif
                'langsung_menjawab',    -- negatif: AI membocorkan jawaban
                'tidak_relevan',        -- negatif
                'sulit_dipahami',       -- negatif
                'terlalu_panjang'       -- negatif
              )),
  catatan     text not null default '',
  created_at  timestamptz not null default now(),

  -- Satu siswa satu penilaian per pesan; menekan ulang = mengubah.
  unique (message_id, user_id)
);

create index if not exists message_feedback_pesan_idx on public.message_feedback (message_id);


-- =============================================================
--  5. TABEL manual_scores — penilaian MANUAL guru
-- =============================================================
--  Guru menilai transkrip dengan rubrik yang SAMA seperti AI.
--  Selisih skor guru vs skor AI = ukuran seberapa bisa dipercaya
--  penilaian AI (inter-rater agreement).
create table if not exists public.manual_scores (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  penilai_id    uuid not null references public.profiles(id) on delete cascade,

  skor          int not null check (skor          between 1 and 10),
  interpretasi  int not null check (interpretasi  between 1 and 10),
  analisis      int not null check (analisis      between 1 and 10),
  evaluasi      int not null check (evaluasi      between 1 and 10),
  inferensi     int not null check (inferensi     between 1 and 10),
  eksplanasi    int not null check (eksplanasi    between 1 and 10),
  regulasi_diri int not null check (regulasi_diri between 1 and 10),

  catatan       text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Satu guru satu penilaian per sesi. Dua guru boleh menilai sesi yang
  -- sama — justru bagus, itu memberi pembanding antar-penilai manusia.
  unique (session_id, penilai_id)
);

create index if not exists manual_scores_sesi_idx on public.manual_scores (session_id);


-- =============================================================
--  6. ROW LEVEL SECURITY
-- =============================================================

alter table public.ai_calls         enable row level security;
alter table public.message_feedback enable row level security;
alter table public.manual_scores    enable row level security;

-- --- profiles: guru/admin boleh membaca siswa pantauannya ----
--  Policy lama "profil sendiri: baca" tetap ada. Beberapa policy
--  SELECT digabung dengan OR, jadi keduanya berlaku bersamaan.
drop policy if exists "profil: pantauan guru/admin" on public.profiles;
create policy "profil: pantauan guru/admin" on public.profiles
  for select to authenticated
  using (public.boleh_pantau(id));

-- --- sessions ------------------------------------------------
drop policy if exists "sesi: pantauan guru/admin" on public.sessions;
create policy "sesi: pantauan guru/admin" on public.sessions
  for select to authenticated
  using (public.boleh_pantau(user_id));

-- --- messages ------------------------------------------------
drop policy if exists "pesan: pantauan guru/admin" on public.messages;
create policy "pesan: pantauan guru/admin" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = messages.session_id and public.boleh_pantau(s.user_id)
    )
  );

-- --- scores --------------------------------------------------
drop policy if exists "nilai: pantauan guru/admin" on public.scores;
create policy "nilai: pantauan guru/admin" on public.scores
  for select to authenticated
  using (
    exists (
      select 1 from public.sessions s
      where s.id = scores.session_id and public.boleh_pantau(s.user_id)
    )
  );

-- --- ai_calls ------------------------------------------------
--  Ditulis oleh server memakai service-role (melewati RLS), jadi
--  tidak perlu policy INSERT untuk pengguna biasa.
--  Dibaca: admin semua, guru hanya milik siswa pantauannya.
drop policy if exists "ai_calls: baca admin"     on public.ai_calls;
drop policy if exists "ai_calls: baca guru"      on public.ai_calls;

create policy "ai_calls: baca admin" on public.ai_calls
  for select to authenticated
  using (public.is_admin());

create policy "ai_calls: baca guru" on public.ai_calls
  for select to authenticated
  using (user_id is not null and public.boleh_pantau(user_id));

-- --- message_feedback ----------------------------------------
--  Siswa: menulis & membaca penilaiannya sendiri, dan HANYA untuk
--  pesan di sesi miliknya sendiri.
drop policy if exists "feedback: milik sendiri"    on public.message_feedback;
drop policy if exists "feedback: pantauan guru"    on public.message_feedback;

create policy "feedback: milik sendiri" on public.message_feedback
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.messages m
      join public.sessions s on s.id = m.session_id
      where m.id = message_feedback.message_id and s.user_id = auth.uid()
    )
  );

create policy "feedback: pantauan guru" on public.message_feedback
  for select to authenticated
  using (public.boleh_pantau(user_id));

-- --- manual_scores -------------------------------------------
--  Guru/admin menilai sesi yang boleh dipantaunya, dan hanya boleh
--  menyimpan atas namanya sendiri (penilai_id = dirinya).
drop policy if exists "penilaian manual: guru"  on public.manual_scores;
drop policy if exists "penilaian manual: baca"  on public.manual_scores;

create policy "penilaian manual: guru" on public.manual_scores
  for all to authenticated
  using (
    penilai_id = auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.id = manual_scores.session_id and public.boleh_pantau(s.user_id)
    )
  )
  with check (
    penilai_id = auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.id = manual_scores.session_id and public.boleh_pantau(s.user_id)
    )
  );

-- Admin boleh membaca semua penilaian manual (untuk analisis
-- kesepakatan antar-penilai), tanpa boleh mengubah milik guru lain.
create policy "penilaian manual: baca" on public.manual_scores
  for select to authenticated
  using (public.is_admin());


-- =============================================================
--  7. TRIGGER PROFIL: ikut menangkap nama dari Google
-- =============================================================
--  Login Google TIDAK mengisi 'nama'. Google mengirim 'full_name'
--  dan 'name'. Tanpa coalesce ini, siswa yang masuk lewat Google
--  namanya kosong di halaman onboarding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nama)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nama',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================
--  8. VIEW PEMBANDING: skor AI vs skor guru
-- =============================================================
--  Dipakai halaman /admin/ai. Dibuat sebagai view biasa (bukan
--  security definer) supaya RLS tabel di bawahnya tetap berlaku.
create or replace view public.v_perbandingan_skor as
select
  s.id                as session_id,
  s.user_id,
  s.mapel,
  s.mulai_at,
  ai.skor             as skor_ai,
  ms.skor             as skor_guru,
  ms.penilai_id,
  abs(ai.skor - ms.skor) as selisih,
  ai.interpretasi     as ai_interpretasi,  ms.interpretasi  as guru_interpretasi,
  ai.analisis         as ai_analisis,      ms.analisis      as guru_analisis,
  ai.evaluasi         as ai_evaluasi,      ms.evaluasi      as guru_evaluasi,
  ai.inferensi        as ai_inferensi,     ms.inferensi     as guru_inferensi,
  ai.eksplanasi       as ai_eksplanasi,    ms.eksplanasi    as guru_eksplanasi,
  ai.regulasi_diri    as ai_regulasi,      ms.regulasi_diri as guru_regulasi
from public.sessions s
join public.scores        ai on ai.session_id = s.id
join public.manual_scores ms on ms.session_id = s.id;

-- WAJIB. Tanpa ini view berjalan dengan hak PEMBUAT-nya, sehingga RLS
-- tabel di bawahnya dilewati dan siapa pun yang login bisa membaca skor
-- seluruh siswa. security_invoker membuat view memakai hak PEMBACA-nya.
alter view public.v_perbandingan_skor set (security_invoker = on);


-- =============================================================
--  SELESAI
-- =============================================================
--  Menjadikan sebuah akun GURU (ganti emailnya):
--
--    update public.profiles
--       set role = 'guru', sekolah = 'SMAN 1 Contoh', onboarded = true
--     where id = (select id from auth.users where email = 'guru@contoh.com');
--
--  PENTING: kolom 'sekolah' guru harus PERSIS sama dengan yang
--  diisi siswa saat onboarding (huruf besar/kecil boleh beda).
--  Kalau berbeda, daftar siswa di dashboard guru akan kosong.
