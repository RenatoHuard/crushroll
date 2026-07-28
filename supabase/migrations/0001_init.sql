-- =========================================================
-- CrushRoll - Schema inicial
-- Tabelas: profiles (Usuario) e crushes
-- =========================================================

-- ---------------------------------------------------------
-- profiles: dados do Usuario, 1:1 com auth.users
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  instagram text,
  twitter_x text,
  tiktok text,
  facebook text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- crushes: perfis cadastrados pelo usuario
-- ---------------------------------------------------------
create table if not exists public.crushes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  instagram text,
  twitter_x text,
  tiktok text,
  facebook text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crushes_user_id_idx on public.crushes (user_id);

-- ---------------------------------------------------------
-- trigger: cria profile automaticamente no signup
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- updated_at automatico
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_crushes_updated_at on public.crushes;
create trigger set_crushes_updated_at
  before update on public.crushes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- RLS: isolamento por conta
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.crushes enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "crushes_select_own" on public.crushes;
create policy "crushes_select_own" on public.crushes
  for select using (auth.uid() = user_id);

drop policy if exists "crushes_insert_own" on public.crushes;
create policy "crushes_insert_own" on public.crushes
  for insert with check (auth.uid() = user_id);

drop policy if exists "crushes_update_own" on public.crushes;
create policy "crushes_update_own" on public.crushes
  for update using (auth.uid() = user_id);

drop policy if exists "crushes_delete_own" on public.crushes;
create policy "crushes_delete_own" on public.crushes
  for delete using (auth.uid() = user_id);
