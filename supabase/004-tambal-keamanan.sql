-- =============================================================
--  AI DIALEKTIKA — Tambalan Keamanan & Integritas Data Penelitian
-- =============================================================
--  CARA PAKAI:
--   1. Buka Supabase > SQL Editor > New query
--   2. Copy SELURUH isi file ini, paste, klik "Run"
--   3. Jalankan sekali saja. Aman diulang.
--
--  WAJIB dijalankan sebelum siswa memakai aplikasi.
-- =============================================================


-- =============================================================
--  1. CELAH: siswa bisa mengangkat dirinya sendiri jadi admin
-- =============================================================
--  Kebijakan lama:
--
--    create policy "profil sendiri: ubah" on public.profiles
--      for update using (id = auth.uid()) with check (id = auth.uid());
--
--  Kebijakan itu hanya memeriksa BARIS mana yang boleh diubah, sama
--  sekali tidak membatasi KOLOM mana. Jadi siswa mana pun cukup
--  memanggil dari browser:
--
--    supabase.from('profiles').update({ role: 'admin' }).eq('id', <id-nya>)
--
--  ...lalu ia bisa membuka /pengaturan, mengganti model AI, dan (lewat
--  role admin) membaca profil seluruh siswa. Ini juga merusak penelitian:
--  siswa bisa memindahkan dirinya dari kelompok kontrol ke eksperimen.
--
--  PostgreSQL tidak bisa membatasi kolom lewat policy, jadi dijaga
--  dengan trigger: kolom sensitif dikembalikan ke nilai lamanya.

create or replace function public.jaga_kolom_sensitif()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Hanya membatasi pengguna aplikasi (JWT role 'authenticated').
  -- service_role (klien admin di server) dan SQL Editor dibiarkan lewat,
  -- kalau tidak, perintah "jadikan akun ini admin" di README ikut gagal
  -- tanpa pesan error apa pun.
  if coalesce(auth.role(), 'postgres') <> 'authenticated' then
    return new;
  end if;

  -- Role TIDAK PERNAH boleh diubah dari browser, oleh siapa pun.
  new.role := old.role;

  -- Kelompok, kode siswa, dan sekolah hanya boleh diisi SEKALI (saat
  -- onboarding). Sesudah terisi, hanya admin lewat SQL yang boleh
  -- membetulkan. Ini menjaga data penelitian tidak berubah di tengah
  -- masa intervensi.
  if old.kelompok   is not null then new.kelompok   := old.kelompok;   end if;
  if old.kode_siswa is not null then new.kode_siswa := old.kode_siswa; end if;

  -- Persetujuan riset yang sudah diberikan tidak boleh "hilang" diam-diam
  -- karena update parsial dari halaman profil.
  if old.consent then
    new.consent    := true;
    new.consent_at := old.consent_at;
  end if;

  return new;
end;
$$;

drop trigger if exists jaga_profil on public.profiles;
create trigger jaga_profil
  before update on public.profiles
  for each row execute function public.jaga_kolom_sensitif();


-- =============================================================
--  2. CELAH: skor bisa dikarang sendiri oleh siswa
-- =============================================================
--  Kebijakan "nilai di sesi sendiri" memberi siswa hak FOR ALL —
--  termasuk INSERT dan UPDATE. Artinya siswa bisa menulis skor 10
--  untuk dirinya sendiri langsung dari browser tanpa berdiskusi:
--
--    supabase.from('scores').insert({ session_id: ..., skor: 10, ... })
--
--  Seluruh data penelitian jadi tidak sahih. Skor HANYA boleh ditulis
--  server lewat /api/nilai (memakai service-role), jadi hak tulis siswa
--  dicabut dan disisakan hak baca saja.
drop policy if exists "nilai di sesi sendiri" on public.scores;
drop policy if exists "nilai: baca sesi sendiri" on public.scores;

create policy "nilai: baca sesi sendiri" on public.scores
  for select to authenticated
  using (
    exists (select 1 from public.sessions s
            where s.id = scores.session_id and s.user_id = auth.uid())
  );


-- =============================================================
--  3. CELAH: sesi bisa ditandai "selesai" tanpa dinilai, dan
--     pesan bisa dikarang seolah-olah dari AI
-- =============================================================
--  messages memberi siswa hak FOR ALL, sehingga siswa bisa menyisipkan
--  baris peran='assistant' berisi apa pun. Log chat adalah salah satu
--  sumber data penelitian ("Observasi Log Chat AI"), jadi isinya harus
--  benar-benar berasal dari AI.
--
--  Siswa tetap perlu menulis pesannya sendiri (peran='user') karena
--  /api/chat menyimpannya memakai sesi login siswa.
drop policy if exists "pesan di sesi sendiri" on public.messages;
drop policy if exists "pesan: baca sesi sendiri" on public.messages;
drop policy if exists "pesan: tulis milik siswa" on public.messages;

create policy "pesan: baca sesi sendiri" on public.messages
  for select to authenticated
  using (
    exists (select 1 from public.sessions s
            where s.id = messages.session_id and s.user_id = auth.uid())
  );

create policy "pesan: tulis milik siswa" on public.messages
  for insert to authenticated
  with check (
    peran = 'user'                      -- balasan AI hanya boleh ditulis server
    and exists (select 1 from public.sessions s
                where s.id = messages.session_id
                  and s.user_id = auth.uid()
                  and s.status = 'berlangsung')   -- sesi selesai = terkunci
  );

--  Sesi: siswa boleh membuat dan membaca sesinya sendiri, tapi tidak
--  boleh mengubah status/waktu selesai (itu wewenang /api/nilai) dan
--  tidak boleh menghapus jejak sesinya.
drop policy if exists "sesi sendiri"          on public.sessions;
drop policy if exists "sesi: baca sendiri"    on public.sessions;
drop policy if exists "sesi: buat sendiri"    on public.sessions;
drop policy if exists "sesi: ubah topik"      on public.sessions;

create policy "sesi: baca sendiri" on public.sessions
  for select to authenticated using (user_id = auth.uid());

create policy "sesi: buat sendiri" on public.sessions
  for insert to authenticated with check (user_id = auth.uid());

create policy "sesi: ubah topik" on public.sessions
  for update to authenticated
  using (user_id = auth.uid() and status = 'berlangsung')
  with check (user_id = auth.uid());

-- Status sesi hanya boleh berpindah 'berlangsung' -> 'selesai' oleh
-- server. Dijaga trigger karena, sama seperti kasus role di atas,
-- policy tidak bisa membatasi kolom.
create or replace function public.jaga_status_sesi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), 'postgres') <> 'authenticated' then
    return new;
  end if;
  new.status     := old.status;
  new.selesai_at := old.selesai_at;
  new.user_id    := old.user_id;
  new.mulai_at   := old.mulai_at;
  return new;
end;
$$;

drop trigger if exists jaga_sesi on public.sessions;
create trigger jaga_sesi
  before update on public.sessions
  for each row execute function public.jaga_status_sesi();


-- =============================================================
--  4. CELAH TERBESAR: kebijakan lama dengan nama berbeda
-- =============================================================
--  Database produksi ternyata memakai kebijakan buatan tangan yang
--  namanya TIDAK sama dengan yang ada di supabase/schema.sql:
--
--    "skor sesi sendiri - insert"   (bukan "nilai di sesi sendiri")
--    "pesan sesi sendiri - insert"  (bukan "pesan di sesi sendiri")
--    "sesi sendiri - update"        (bukan "sesi sendiri")
--    "profil sendiri - update"      (bukan "profil sendiri: ubah")
--
--  Akibatnya semua "drop policy" di bagian 1-3 tidak mengenai apa pun,
--  kebijakan longgar tetap hidup, dan celahnya masih terbuka meski
--  kebijakan baru sudah dipasang. Beberapa kebijakan permisif berlaku
--  dengan logika ATAU, jadi yang paling longgar yang menang.
--
--  Bagian ini membuang semuanya lalu memasang satu set kanonik.

drop policy if exists "pesan sesi sendiri - insert" on public.messages;
drop policy if exists "pesan sesi sendiri - select" on public.messages;
drop policy if exists "skor sesi sendiri - insert"  on public.scores;
drop policy if exists "skor sesi sendiri - select"  on public.scores;
drop policy if exists "sesi sendiri - insert"       on public.sessions;
drop policy if exists "sesi sendiri - select"       on public.sessions;
drop policy if exists "sesi sendiri - update"       on public.sessions;
drop policy if exists "profil sendiri - select"     on public.profiles;
drop policy if exists "profil sendiri - update"     on public.profiles;
drop policy if exists "profil sendiri: baca"        on public.profiles;
drop policy if exists "profil sendiri: ubah"        on public.profiles;
drop policy if exists "profil sendiri: buat"        on public.profiles;
drop policy if exists "catatan sendiri - all"       on public.notes;
drop policy if exists "catatan sendiri"             on public.notes;
drop policy if exists "settings dibaca"             on public.app_settings;
drop policy if exists "settings diubah admin"       on public.app_settings;
drop policy if exists "setelan: baca"               on public.app_settings;
drop policy if exists "setelan: tulis"              on public.app_settings;

drop policy if exists "profil: baca sendiri"  on public.profiles;
drop policy if exists "profil: buat sendiri"  on public.profiles;
drop policy if exists "profil: ubah sendiri"  on public.profiles;

create policy "profil: baca sendiri" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profil: buat sendiri" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- Barisnya boleh diubah sendiri; kolom sensitifnya dijaga trigger
-- jaga_kolom_sensitif() di bagian 1.
create policy "profil: ubah sendiri" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "catatan: milik sendiri" on public.notes;
create policy "catatan: milik sendiri" on public.notes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- app_settings sebelumnya bisa dibaca role 'public' — termasuk
-- pengunjung yang belum login — membocorkan model AI yang dipakai.
create policy "setelan: baca" on public.app_settings
  for select to authenticated using (true);

create policy "setelan: tulis" on public.app_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings (id, chat_model, fallback_model)
values ('global', 'gemini/gemini-3.5-flash', 'gpt-4o-mini')
on conflict (id) do nothing;


-- =============================================================
--  5. Fungsi trigger tidak boleh dipanggil lewat API
-- =============================================================
--  Fungsi trigger dijalankan oleh trigger-nya sendiri (dengan hak
--  pemilik tabel), jadi tidak seorang pun perlu hak EXECUTE. Tanpa
--  revoke ini, PostgREST mengeksposnya sebagai endpoint
--  /rest/v1/rpc/jaga_kolom_sensitif dan sejenisnya.
revoke execute on function public.jaga_kolom_sensitif() from anon, authenticated, public;
revoke execute on function public.jaga_status_sesi()    from anon, authenticated, public;
revoke execute on function public.handle_new_user()     from anon, authenticated, public;


-- =============================================================
--  SELESAI — cek hasilnya
-- =============================================================
--  Kebijakan yang sekarang berlaku:
--    select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public' order by tablename, policyname;
--
--  Uji celah role (jalankan sebagai siswa dari browser, harus GAGAL
--  mengubah role):
--    supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)
