-- ============================================================================
-- Secure Networking Tracker — database schema
--
-- Run against: Neon project qw-neon-secure-networking-tracker
--              branch "production", database "neondb"
--
-- This file is the whole backend security model. Three things protect the data:
--   1. NOT NULL + CHECK constraints  -> reject malformed rows
--   2. Row Level Security policies   -> reject rows that aren't yours
--   3. Narrow GRANTs                 -> the API role can touch nothing else
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. The contacts table
--
-- user_id defaults to auth.user_id(), which reads the "sub" claim out of the
-- signed-in user's JWT. Because the DATABASE fills this in, the browser cannot
-- choose who owns a row -- even if it tries to send a user_id, the policy in
-- section 4 rejects it.
-- ----------------------------------------------------------------------------
create table if not exists public.contacts (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null default (auth.user_id()),
  name        text        not null,
  company     text,
  role        text,
  met_where   text,
  notes       text,
  priority    text        not null default 'medium',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- A name of "" or "   " is not a name.
  constraint contacts_name_not_blank check (length(btrim(name)) > 0),

  -- The assignment allows exactly these three values. Enforced here so it is
  -- true no matter what code talks to the database.
  constraint contacts_priority_valid check (priority in ('high', 'medium', 'low')),

  -- ----------------------------------------------------------------------
  -- Two columns that exist only so sorting behaves the way a person expects.
  -- Both are GENERATED: the database derives them and keeps them in step, so
  -- they can never disagree with the columns they come from.
  -- ----------------------------------------------------------------------

  -- Sorting by the priority text gives high, low, medium -- alphabetical and
  -- meaningless. This ranks them 1/2/3 so the order reads high, medium, low.
  priority_rank smallint generated always as (
    case priority when 'high' then 1 when 'medium' then 2 else 3 end
  ) stored,

  -- Postgres compares text by byte value, so every capitalised name sorts
  -- before every lowercase one and "alice" lands after "Zoe". Sorting on the
  -- lowercased name fixes that.
  name_sort text generated always as (lower(btrim(name))) stored
);


-- ----------------------------------------------------------------------------
-- 2. Index
-- Every query is "my contacts, newest first", so index exactly that.
-- ----------------------------------------------------------------------------
create index if not exists contacts_user_created_idx
  on public.contacts (user_id, created_at desc);

create index if not exists contacts_user_priority_idx
  on public.contacts (user_id, priority_rank, name_sort);

create index if not exists contacts_user_name_idx
  on public.contacts (user_id, name_sort);


-- ----------------------------------------------------------------------------
-- 3. Turn on Row Level Security
--
-- Once enabled, Postgres denies EVERYTHING by default. Nothing is readable
-- until a policy below explicitly allows it. Fail-closed, not fail-open.
-- ----------------------------------------------------------------------------
alter table public.contacts enable row level security;


-- ----------------------------------------------------------------------------
-- 4. Ownership policies -- one per operation, as the assignment requires
--
-- USING      = which existing rows you may see or target
-- WITH CHECK = what the row is allowed to look like after you write it
-- ----------------------------------------------------------------------------

-- You can only read your own rows.
create policy contacts_select on public.contacts
  for select to authenticated
  using (auth.user_id() = user_id);

-- You can only create rows owned by you.
create policy contacts_insert on public.contacts
  for insert to authenticated
  with check (auth.user_id() = user_id);

-- You can only edit your own rows (USING), and you cannot hand a row to
-- someone else by rewriting user_id (WITH CHECK). Both halves are required.
create policy contacts_update on public.contacts
  for update to authenticated
  using (auth.user_id() = user_id)
  with check (auth.user_id() = user_id);

-- You can only delete your own rows.
create policy contacts_delete on public.contacts
  for delete to authenticated
  using (auth.user_id() = user_id);


-- ----------------------------------------------------------------------------
-- 5. Grants
--
-- RLS decides WHICH ROWS. Grants decide WHICH TABLES. Both are needed: without
-- these the Data API returns permission errors even with perfect policies.
--
-- Note what is absent: the "anonymous" role is granted nothing at all, so
-- signed-out visitors cannot reach this table by any route.
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;


-- ----------------------------------------------------------------------------
-- 6. Keep updated_at honest
-- Set by the database on every edit, so it cannot be faked by the client.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contacts_set_updated_at on public.contacts;

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();
