-- Milestone 1: profiles, households, members, invites, and the recipes table.
-- Access rule: a user can read and write a row only if they belong to that row's household.

create extension if not exists pgcrypto with schema extensions;

create type public.household_role as enum ('owner', 'member');
create type public.recipe_visibility as enum ('household', 'public');
create type public.recipe_source_type as enum ('manual', 'web', 'instagram');
create type public.recipe_steps_style as enum ('full', 'short');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text check (name is null or char_length(name) <= 80),
  email text not null,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.household_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- The MVP has one household per user. Drop this index to allow several.
create unique index household_members_one_per_user on public.household_members (user_id);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index household_invites_household_idx on public.household_invites (household_id);
create unique index household_invites_one_pending_per_email
  on public.household_invites (household_id, email) where accepted_at is null;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  visibility public.recipe_visibility not null default 'household',
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  source_url text,
  source_type public.recipe_source_type not null default 'manual',
  source_author text,
  steps_style public.recipe_steps_style not null default 'full',
  yield_qty numeric check (yield_qty > 0),
  yield_unit_label text,
  servings numeric check (servings > 0),
  prep_min integer check (prep_min >= 0),
  cook_min integer check (cook_min >= 0),
  total_min integer check (total_min >= 0),
  photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- MVP recipes are household-only. Phase 3 drops this constraint to allow 'public'.
  constraint recipes_visibility_household_only check (visibility = 'household')
);

create index recipes_household_created_idx on public.recipes (household_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies don't recurse)
-- ---------------------------------------------------------------------------

create function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = p_household_id and m.user_id = (select auth.uid())
  );
$$;

create function public.shares_household_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members mine
    join public.household_members theirs on theirs.household_id = mine.household_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

create function public.current_user_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(coalesce((select auth.jwt()) ->> 'email', ''));
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, lower(new.email), nullif(btrim(new.raw_user_meta_data ->> 'name'), ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_recipe()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;

create trigger recipes_touch
  before update on public.recipes
  for each row execute function public.touch_recipe();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.recipes enable row level security;

create policy "profiles: read self and household members" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_household_with(id));

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "households: members read" on public.households
  for select to authenticated
  using (public.is_household_member(id));

create policy "households: members rename" on public.households
  for update to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

create policy "members: members read" on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

create policy "invites: members and invitee read" on public.household_invites
  for select to authenticated
  using (
    public.is_household_member(household_id)
    or (accepted_at is null and email = public.current_user_email())
  );

create policy "invites: members revoke" on public.household_invites
  for delete to authenticated
  using (public.is_household_member(household_id) and accepted_at is null);

create policy "recipes: members read" on public.recipes
  for select to authenticated
  using (public.is_household_member(household_id));

create policy "recipes: members insert" on public.recipes
  for insert to authenticated
  with check (public.is_household_member(household_id) and created_by = (select auth.uid()));

create policy "recipes: members update" on public.recipes
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "recipes: members delete" on public.recipes
  for delete to authenticated
  using (public.is_household_member(household_id));

-- Column-level guard: profiles may only change their own name.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs: household lifecycle (inserts into households/members only happen here)
-- ---------------------------------------------------------------------------

create function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if exists (select 1 from public.household_members where user_id = v_uid) then
    raise exception 'You already belong to a household' using errcode = 'P0001';
  end if;

  insert into public.households (name, created_by)
  values (btrim(p_name), v_uid)
  returning id into v_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_id, v_uid, 'owner');

  return v_id;
end;
$$;

create function public.create_invite(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_email text := lower(btrim(p_email));
  v_token text;
begin
  select household_id into v_household from public.household_members where user_id = v_uid;
  if v_household is null then
    raise exception 'Create a household first' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.household_members m
    join public.profiles p on p.id = m.user_id
    where m.household_id = v_household and p.email = v_email
  ) then
    raise exception '% is already in your household', v_email using errcode = 'P0001';
  end if;

  delete from public.household_invites
  where household_id = v_household and email = v_email and accepted_at is null;

  insert into public.household_invites (household_id, email, invited_by)
  values (v_household, v_email, v_uid)
  returning token into v_token;

  return v_token;
end;
$$;

create function public.leave_household()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_role public.household_role;
begin
  delete from public.household_members
  where user_id = v_uid
  returning household_id, role into v_household, v_role;

  if v_household is null then
    return;
  end if;

  if not exists (select 1 from public.household_members where household_id = v_household) then
    delete from public.households where id = v_household;
  elsif v_role = 'owner' then
    update public.household_members set role = 'owner'
    where (household_id, user_id) = (
      select household_id, user_id from public.household_members
      where household_id = v_household
      order by joined_at
      limit 1
    );
  end if;
end;
$$;

-- What an invitee sees before joining. Requires the secret token.
create function public.get_invite(p_token text)
returns table (
  household_id uuid,
  household_name text,
  invited_by_name text,
  email text,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.household_id, h.name, coalesce(p.name, split_part(p.email, '@', 1)), i.email,
         i.expires_at, i.accepted_at
  from public.household_invites i
  join public.households h on h.id = i.household_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = p_token and auth.uid() is not null;
$$;

create function public.my_pending_invites()
returns table (token text, household_name text, invited_by_name text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.token, h.name, coalesce(p.name, split_part(p.email, '@', 1)), i.expires_at
  from public.household_invites i
  join public.households h on h.id = i.household_id
  left join public.profiles p on p.id = i.invited_by
  where i.accepted_at is null
    and i.expires_at > now()
    and i.email = public.current_user_email()
  order by i.created_at desc;
$$;

create function public.accept_invite(p_token text, p_leave_current boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.household_invites%rowtype;
  v_current uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  select * into v_invite from public.household_invites where token = p_token for update;
  if not found then
    raise exception 'This invite link is not valid' using errcode = 'P0001';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'This invite has already been used' using errcode = 'P0001';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'This invite has expired. Ask for a new one.' using errcode = 'P0001';
  end if;
  if v_invite.email <> public.current_user_email() then
    raise exception 'This invite is for %. Sign in with that email.', v_invite.email
      using errcode = 'P0001';
  end if;

  select household_id into v_current from public.household_members where user_id = v_uid;
  if v_current = v_invite.household_id then
    update public.household_invites set accepted_at = now(), accepted_by = v_uid
    where id = v_invite.id;
    return v_current;
  end if;
  if v_current is not null then
    if not p_leave_current then
      raise exception 'You already belong to another household' using errcode = 'P0002';
    end if;
    perform public.leave_household();
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (v_invite.household_id, v_uid, 'member');

  update public.household_invites set accepted_at = now(), accepted_by = v_uid
  where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: functions are for signed-in users only
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_household_member(uuid),
  public.shares_household_with(uuid),
  public.current_user_email(),
  public.create_household(text),
  public.create_invite(text),
  public.leave_household(),
  public.get_invite(text),
  public.my_pending_invites(),
  public.accept_invite(text, boolean)
to authenticated;
