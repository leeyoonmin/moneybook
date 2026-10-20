-- ============================================================================
-- 머니북 · Supabase schema
-- Run this in the Supabase SQL Editor (project owner).
-- Design: shared household ledger, RLS, soft-deleted transactions,
--         invite codes, per-month budgets.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profiles (one row per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Households & members
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.member_role as enum ('owner', 'editor', 'viewer');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리 가계부' check (char_length(name) between 1 and 40),
  invite_code text not null unique
    default lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'editor',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_idx
  on public.household_members (user_id);

-- ---------------------------------------------------------------------------
-- 3. Categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  name text not null check (char_length(name) between 1 and 12),
  color text not null default '#E4552D' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_fallback boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_unique_name
  on public.categories (household_id, type, lower(name));

create unique index if not exists categories_one_fallback
  on public.categories (household_id, type)
  where is_fallback;

create index if not exists categories_household_idx
  on public.categories (household_id, type, sort_order);

-- ---------------------------------------------------------------------------
-- 4. Transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null check (type in ('expense', 'income')),
  amount bigint not null check (amount > 0 and amount <= 999999999),
  category_id uuid references public.categories(id) on delete set null,
  tx_date date not null,
  memo text not null default '' check (char_length(memo) <= 60),
  method text not null default '카드' check (method in ('카드', '현금', '계좌이체', '기타')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists transactions_household_date_idx
  on public.transactions (household_id, tx_date desc)
  where deleted_at is null;

create index if not exists transactions_household_updated_idx
  on public.transactions (household_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 5. Monthly budgets
-- ---------------------------------------------------------------------------
create table if not exists public.budgets (
  household_id uuid not null references public.households(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount bigint not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (household_id, month)
);

-- ---------------------------------------------------------------------------
-- 6. updated_at / updated_by triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch
before update on public.categories
for each row execute function public.touch_updated_at();

drop trigger if exists budgets_touch on public.budgets;
create trigger budgets_touch
before update on public.budgets
for each row execute function public.touch_updated_at();

create or replace function public.touch_transaction()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch
before update on public.transactions
for each row execute function public.touch_transaction();

-- ---------------------------------------------------------------------------
-- 7. Membership helpers (security definer: avoid RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_household(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid
      and user_id = auth.uid()
      and role in ('owner', 'editor')
  );
$$;

create or replace function public.is_household_owner(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

-- profiles: own row, plus co-members of any shared household
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.household_members me
    join public.household_members them on them.household_id = me.household_id
    where me.user_id = auth.uid() and them.user_id = profiles.id
  )
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- households
drop policy if exists households_select on public.households;
create policy households_select on public.households
for select to authenticated
using (public.is_household_member(id));

drop policy if exists households_update on public.households;
create policy households_update on public.households
for update to authenticated
using (public.can_edit_household(id))
with check (public.can_edit_household(id));

drop policy if exists households_delete on public.households;
create policy households_delete on public.households
for delete to authenticated
using (public.is_household_owner(id));

-- members: read only for clients; writes go through RPCs
drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members
for select to authenticated
using (public.is_household_member(household_id));

-- categories
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
for select to authenticated
using (public.is_household_member(household_id));

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
for insert to authenticated
with check (public.can_edit_household(household_id));

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories
for update to authenticated
using (public.can_edit_household(household_id))
with check (public.can_edit_household(household_id));

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories
for delete to authenticated
using (public.can_edit_household(household_id) and not is_fallback);

-- transactions
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
for select to authenticated
using (public.is_household_member(household_id));

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions
for insert to authenticated
with check (public.can_edit_household(household_id) and created_by = auth.uid());

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions
for update to authenticated
using (public.can_edit_household(household_id))
with check (public.can_edit_household(household_id));

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions
for delete to authenticated
using (public.can_edit_household(household_id));

-- budgets
drop policy if exists budgets_select on public.budgets;
create policy budgets_select on public.budgets
for select to authenticated
using (public.is_household_member(household_id));

drop policy if exists budgets_insert on public.budgets;
create policy budgets_insert on public.budgets
for insert to authenticated
with check (public.can_edit_household(household_id));

drop policy if exists budgets_update on public.budgets;
create policy budgets_update on public.budgets
for update to authenticated
using (public.can_edit_household(household_id))
with check (public.can_edit_household(household_id));

drop policy if exists budgets_delete on public.budgets;
create policy budgets_delete on public.budgets
for delete to authenticated
using (public.can_edit_household(household_id));

-- ---------------------------------------------------------------------------
-- 9. RPCs
-- ---------------------------------------------------------------------------

-- Create a household, owner membership, and the default categories atomically.
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.households (name, created_by)
  values (coalesce(nullif(btrim(p_name), ''), '우리 가계부'), uid)
  returning id into hid;

  insert into public.household_members (household_id, user_id, role)
  values (hid, uid, 'owner');

  insert into public.categories
    (household_id, type, name, color, sort_order, is_fallback)
  values
    (hid, 'expense', '식비',      '#E4552D', 0, false),
    (hid, 'expense', '카페·간식', '#C98A2E', 1, false),
    (hid, 'expense', '교통',      '#3B6FE0', 2, false),
    (hid, 'expense', '생활',      '#4C9A6A', 3, false),
    (hid, 'expense', '쇼핑',      '#B4559B', 4, false),
    (hid, 'expense', '건강',      '#3E9E9E', 5, false),
    (hid, 'expense', '문화',      '#7A63C9', 6, false),
    (hid, 'expense', '주거·통신', '#8A7A5C', 7, false),
    (hid, 'expense', '기타',      '#83827A', 8, true),
    (hid, 'income',  '급여',      '#1E7A58', 0, false),
    (hid, 'income',  '부수입',    '#3E9E9E', 1, false),
    (hid, 'income',  '기타수입',  '#83827A', 2, true);

  return hid;
end;
$$;

-- Join by invite code (idempotent; existing role is preserved).
create or replace function public.join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id into hid
  from public.households
  where invite_code = lower(btrim(p_code));

  if hid is null then
    raise exception 'INVALID_INVITE_CODE';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (hid, uid, 'editor')
  on conflict (household_id, user_id) do nothing;

  return hid;
end;
$$;

-- Owner-only invite code rotation.
create or replace function public.rotate_invite_code(hid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  if not public.is_household_owner(hid) then
    raise exception 'FORBIDDEN';
  end if;

  update public.households
  set invite_code = lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
  where id = hid
  returning invite_code into code;

  return code;
end;
$$;

-- Owner can remove others; a member can leave (owner must delete/transfer first).
create or replace function public.remove_member(hid uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_user = auth.uid() then
    if public.is_household_owner(hid) then
      raise exception 'OWNER_CANNOT_LEAVE';
    end if;
  elsif not public.is_household_owner(hid) then
    raise exception 'FORBIDDEN';
  end if;

  delete from public.household_members
  where household_id = hid and user_id = p_user;
end;
$$;

-- Delete a category; its transactions move to the matching fallback category.
create or replace function public.delete_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.categories;
  fb uuid;
begin
  select * into c from public.categories where id = p_category_id;
  if c.id is null then
    return;
  end if;
  if not public.can_edit_household(c.household_id) then
    raise exception 'FORBIDDEN';
  end if;
  if c.is_fallback then
    raise exception 'FALLBACK_CATEGORY';
  end if;

  select id into fb
  from public.categories
  where household_id = c.household_id and type = c.type and is_fallback
  limit 1;

  if fb is not null then
    update public.transactions
    set category_id = fb
    where category_id = p_category_id and deleted_at is null;
  end if;

  delete from public.categories where id = p_category_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Grants (RLS still applies)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.households to authenticated;
grant select on public.household_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.can_edit_household(uuid) from public;
revoke all on function public.is_household_owner(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.can_edit_household(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;

revoke all on function public.create_household(text) from public;
revoke all on function public.join_household(text) from public;
revoke all on function public.rotate_invite_code(uuid) from public;
revoke all on function public.remove_member(uuid, uuid) from public;
revoke all on function public.delete_category(uuid) from public;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.rotate_invite_code(uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.delete_category(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Realtime (family members see each other's changes)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
    ) then
      alter publication supabase_realtime add table public.transactions;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
    ) then
      alter publication supabase_realtime add table public.categories;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'budgets'
    ) then
      alter publication supabase_realtime add table public.budgets;
    end if;
  end if;
end $$;
