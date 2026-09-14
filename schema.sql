-- ============================================================
-- Skema database Desilku untuk Supabase (Postgres)
-- Jalankan seluruh file ini di: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1) PROFILES: menyimpan username <-> email (Supabase Auth sendiri
--    menyimpan email & password terenkripsi di tabel auth.users,
--    kita tidak pernah menyentuh password secara langsung).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text unique not null,
  role text not null default 'warga' check (role in ('warga', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
-- Aman dijalankan ulang pada project yang sudah terlanjur membuat profiles.
alter table public.profiles add column if not exists role text not null default 'warga';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('warga', 'admin'));

-- Diperlukan agar login-by-username & "lupa sandi" bisa mencari
-- email/username SEBELUM pengguna login. Hanya kolom username & email
-- yang ada di tabel ini (data pribadi sensitif ada di tabel lain
-- dengan RLS yang jauh lebih ketat).
drop policy if exists "Public can look up username/email" on public.profiles;
create policy "Public can look up username/email"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Otomatis membuat baris profiles setiap kali ada pendaftaran baru lewat
-- Supabase Auth (dipicu dari signUp({..., options: { data: { username }}})).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, role)
  values (new.id, lower(trim(new.raw_user_meta_data->>'username')), lower(trim(new.email)), 'warga');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2) DESIL_SUBMISSIONS: data formulir yang sangat sensitif
--    (NIK, KK, pendapatan, aset, kondisi rumah, dll) disimpan sebagai JSON.
--    RLS memastikan SETIAP pengguna hanya bisa membaca/menulis datanya sendiri.
create table if not exists public.desil_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null,
  score int,
  indikasi text,
  created_at timestamptz default now()
);

alter table public.desil_submissions enable row level security;

drop policy if exists "Users can insert their own submissions" on public.desil_submissions;
create policy "Users can insert their own submissions"
  on public.desil_submissions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own submissions" on public.desil_submissions;
create policy "Users can view their own submissions"
  on public.desil_submissions for select
  using (auth.uid() = user_id);

-- ============================================================
-- CATATAN UNTUK PETUGAS DESA / ADMIN (opsional, baca README.md):
-- Tabel di atas SENGAJA tidak bisa dibaca siapa pun kecuali pemiliknya.
-- Untuk membuat dashboard admin yang bisa melihat semua submission warga,
-- JANGAN buka akses publik ke tabel ini. Sebaiknya:
--   a) tambahkan kolom `is_admin boolean default false` di profiles,
--   b) buat policy SELECT tambahan `using (exists (select 1 from
--      public.profiles where id = auth.uid() and is_admin))`,
--   c) atau ambil datanya lewat Supabase Edge Function pakai service_role
--      key (JANGAN PERNAH taruh service_role key di kode frontend).
-- ============================================================


-- ============================================================
-- ADMIN: hanya profil dengan role = 'admin' yang dapat membaca
-- seluruh data submission.
-- Jadikan akun admin secara manual, misalnya:
-- update public.profiles set role = 'admin' where email = 'admin@contoh.id';
-- ============================================================
drop policy if exists "Admins can view all submissions" on public.desil_submissions;
create policy "Admins can view all submissions"
  on public.desil_submissions for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- ============================================================
-- STORAGE: SKCK opsional
-- Bucket private; file hanya bisa diakses oleh pemilik akun atau admin.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('dokumen-warga', 'dokumen-warga', false)
on conflict (id) do update set public = false;

drop policy if exists "Warga can upload own documents" on storage.objects;
create policy "Warga can upload own documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dokumen-warga'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Warga can read own documents" on storage.objects;
create policy "Warga can read own documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dokumen-warga'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );
