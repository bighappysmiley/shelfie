-- Shared libraries schema (applied via Supabase MCP)
-- See team_libraries + team_libraries_rls_fix migrations

create table if not exists public.libraries (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Library',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.library_members (
  library_id uuid not null references public.libraries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (library_id, user_id)
);

create table if not exists public.library_invites (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references public.libraries(id) on delete cascade,
  email text,
  phone text,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  constraint library_invites_contact check (email is not null or phone is not null)
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  require_2fa boolean not null default false,
  preferred_auth text not null default 'email' check (preferred_auth in ('email', 'phone', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
