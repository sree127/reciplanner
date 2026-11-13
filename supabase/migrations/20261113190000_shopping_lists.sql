-- Milestone 3: shared shopping lists.
-- Several lists per household; add a recipe's ingredients to a chosen list (scaled to the
-- servings you picked), merging duplicate ingredients; tick items off with live sync.
-- Access rule, as everywhere: a row is readable/writable only by members of its household.

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  is_default boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index shopping_lists_household_idx on public.shopping_lists (household_id, created_at);
-- At most one default list per household.
create unique index shopping_lists_one_default on public.shopping_lists (household_id) where is_default;

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  ingredient_id uuid references public.ingredients (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  aisle text,
  qty_min numeric check (qty_min >= 0),
  qty_max numeric check (qty_max >= 0),
  unit_id text references public.units (id),
  unit_label text,
  grams numeric check (grams >= 0),
  checked boolean not null default false,
  checked_by uuid references auth.users (id) on delete set null,
  checked_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shopping_list_items_list_idx on public.shopping_list_items (list_id, position);

create table public.shopping_list_item_sources (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.shopping_list_items (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete set null,
  recipe_title text,
  servings_used numeric
);

create index shopping_list_item_sources_item_idx on public.shopping_list_item_sources (item_id);

-- ---------------------------------------------------------------------------
-- Helpers and triggers
-- ---------------------------------------------------------------------------

create function public.is_shopping_list_member(p_list_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shopping_lists l
    where l.id = p_list_id and public.is_household_member(l.household_id)
  );
$$;

create function public.touch_shopping_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.checked is distinct from old.checked then
    if new.checked then
      new.checked_by := coalesce((select auth.uid()), new.checked_by);
      new.checked_at := now();
    else
      new.checked_by := null;
      new.checked_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger shopping_items_touch
  before update on public.shopping_list_items
  for each row execute function public.touch_shopping_item();

-- When the default list is deleted, promote the oldest remaining list.
create function public.reassign_default_list()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_default then
    update public.shopping_lists set is_default = true
    where id = (
      select id from public.shopping_lists
      where household_id = old.household_id
      order by created_at
      limit 1
    );
  end if;
  return old;
end;
$$;

create trigger shopping_lists_reassign_default
  after delete on public.shopping_lists
  for each row execute function public.reassign_default_list();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.shopping_list_item_sources enable row level security;

create policy "lists: members" on public.shopping_lists
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "list items: members" on public.shopping_list_items
  for all to authenticated
  using (public.is_shopping_list_member(list_id))
  with check (public.is_shopping_list_member(list_id));

create policy "list item sources: members" on public.shopping_list_item_sources
  for all to authenticated
  using (exists (
    select 1 from public.shopping_list_items i
    where i.id = item_id and public.is_shopping_list_member(i.list_id)
  ))
  with check (exists (
    select 1 from public.shopping_list_items i
    where i.id = item_id and public.is_shopping_list_member(i.list_id)
  ));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create function public.create_shopping_list(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_id uuid;
  v_name text := btrim(p_name);
  v_first boolean;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select household_id into v_household from public.household_members where user_id = v_uid;
  if v_household is null then
    raise exception 'Create a household first' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 60 then
    raise exception 'List name must be 1–60 characters' using errcode = 'P0001';
  end if;

  select not exists (select 1 from public.shopping_lists where household_id = v_household) into v_first;
  insert into public.shopping_lists (household_id, name, is_default, created_by)
  values (v_household, v_name, v_first, v_uid)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.set_default_list(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid;
begin
  select household_id into v_household from public.shopping_lists where id = p_list_id;
  if v_household is null or not public.is_household_member(v_household) then
    raise exception 'List not found' using errcode = 'P0001';
  end if;
  update public.shopping_lists set is_default = false
  where household_id = v_household and is_default and id <> p_list_id;
  update public.shopping_lists set is_default = true where id = p_list_id;
end;
$$;

create function public.add_manual_item(p_list_id uuid, p_name text, p_aisle text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_name text := btrim(p_name);
  v_pos int;
begin
  if not public.is_shopping_list_member(p_list_id) then
    raise exception 'List not found' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Item name must be 1–200 characters' using errcode = 'P0001';
  end if;
  select coalesce(max(position), 0) + 1 into v_pos from public.shopping_list_items where list_id = p_list_id;
  insert into public.shopping_list_items (list_id, name, aisle, position)
  values (p_list_id, v_name, nullif(btrim(p_aisle), ''), v_pos)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.clear_checked_items(p_list_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  if not public.is_shopping_list_member(p_list_id) then
    raise exception 'List not found' using errcode = 'P0001';
  end if;
  with deleted as (
    delete from public.shopping_list_items where list_id = p_list_id and checked returning 1
  )
  select count(*) into v_count from deleted;
  return v_count;
end;
$$;

-- Add one recipe ingredient to a list, scaled to p_servings, merging it into an existing
-- unchecked item of the same ingredient and unit (200 g + 150 g flour = 350 g flour).
-- Returns the item's display name, for a confirmation message.
create function public.add_ingredient_to_list(
  p_list_id uuid,
  p_recipe_ingredient_id uuid,
  p_servings numeric
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid;
  v_recipe public.recipes%rowtype;
  v_line record;
  v_factor numeric;
  v_existing uuid;
  v_item uuid;
  v_pos int;
  v_qty_min numeric;
  v_qty_max numeric;
  v_grams numeric;
begin
  select household_id into v_household from public.shopping_lists where id = p_list_id;
  if v_household is null or not public.is_household_member(v_household) then
    raise exception 'List not found' using errcode = 'P0001';
  end if;

  select ri.ingredient_id, ri.qty_min, ri.qty_max, ri.unit_id, ri.unit_label, ri.grams,
         ri.recipe_id, i.name as ing_name, i.aisle as ing_aisle
  into v_line
  from public.recipe_ingredients ri
  join public.ingredients i on i.id = ri.ingredient_id
  where ri.id = p_recipe_ingredient_id;
  if v_line.ingredient_id is null then
    raise exception 'Ingredient not found' using errcode = 'P0001';
  end if;

  select * into v_recipe from public.recipes where id = v_line.recipe_id and household_id = v_household;
  if v_recipe.id is null then
    raise exception 'Recipe not found' using errcode = 'P0001';
  end if;

  v_factor := case
    when p_servings is null or p_servings <= 0 or v_recipe.servings is null or v_recipe.servings <= 0 then 1
    else p_servings / v_recipe.servings
  end;

  v_qty_min := case when v_line.qty_min is null then null else v_line.qty_min * v_factor end;
  v_qty_max := case when v_line.qty_max is null then null else v_line.qty_max * v_factor end;
  v_grams := case when v_line.grams is null then null else v_line.grams * v_factor end;

  -- Merge into an existing unchecked line for the same ingredient and unit, if the amounts
  -- are additive (both have a numeric quantity in the same unit).
  v_existing := null;
  if v_qty_min is not null then
    select id into v_existing
    from public.shopping_list_items
    where list_id = p_list_id
      and not checked
      and ingredient_id is not distinct from v_line.ingredient_id
      and unit_id is not distinct from v_line.unit_id
      and unit_label is not distinct from v_line.unit_label
      and qty_min is not null
    order by position
    limit 1;
  end if;

  if v_existing is not null then
    update public.shopping_list_items set
      qty_min = qty_min + v_qty_min,
      qty_max = case
        when qty_max is null and v_qty_max is null then null
        else coalesce(qty_max, qty_min) + coalesce(v_qty_max, v_qty_min)
      end,
      grams = case when grams is not null and v_grams is not null then grams + v_grams else grams end
    where id = v_existing
    returning id into v_item;
  else
    select coalesce(max(position), 0) + 1 into v_pos from public.shopping_list_items where list_id = p_list_id;
    insert into public.shopping_list_items (
      list_id, ingredient_id, name, aisle, qty_min, qty_max, unit_id, unit_label, grams, position
    ) values (
      p_list_id, v_line.ingredient_id, v_line.ing_name, v_line.ing_aisle, v_qty_min, v_qty_max,
      v_line.unit_id, v_line.unit_label, v_grams, v_pos
    )
    returning id into v_item;
  end if;

  insert into public.shopping_list_item_sources (item_id, recipe_id, recipe_title, servings_used)
  values (v_item, v_recipe.id, v_recipe.title, p_servings);

  return v_line.ing_name;
end;
$$;

revoke execute on function
  public.is_shopping_list_member(uuid),
  public.create_shopping_list(text),
  public.set_default_list(uuid),
  public.add_manual_item(uuid, text, text),
  public.clear_checked_items(uuid),
  public.add_ingredient_to_list(uuid, uuid, numeric)
from public, anon;

grant execute on function
  public.is_shopping_list_member(uuid),
  public.create_shopping_list(text),
  public.set_default_list(uuid),
  public.add_manual_item(uuid, text, text),
  public.clear_checked_items(uuid),
  public.add_ingredient_to_list(uuid, uuid, numeric)
to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast item changes so a tick shows on both phones within ~a second.
-- (RLS still applies to each subscriber.)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.shopping_list_items;
alter publication supabase_realtime add table public.shopping_lists;
