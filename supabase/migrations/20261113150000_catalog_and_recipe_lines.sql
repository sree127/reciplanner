-- Milestone 2: ingredient catalog, units, recipe lines, categories, tags, search.
-- Global catalog rows (household_id is null) are readable by every signed-in user and writable by none.
-- A household row is readable and writable only by members of that household.

create extension if not exists pg_trgm with schema extensions;

alter table public.recipes
  add column is_favorite boolean not null default false;

create type public.unit_kind as enum ('mass', 'volume', 'count');

create table public.units (
  id text primary key,
  name text not null,
  abbrev text not null,
  kind public.unit_kind not null,
  to_base_factor numeric not null check (to_base_factor > 0),
  display boolean not null default true
);

-- Mass base is grams. Volume base is millilitres. cup/oz/lb/fl oz are accepted on input and converted.
insert into public.units (id, name, abbrev, kind, to_base_factor, display) values
  ('g', 'grams', 'g', 'mass', 1, true),
  ('kg', 'kilograms', 'kg', 'mass', 1000, true),
  ('ml', 'millilitres', 'ml', 'volume', 1, true),
  ('l', 'litres', 'l', 'volume', 1000, true),
  ('tsp', 'teaspoons', 'tsp', 'volume', 5, true),
  ('tbsp', 'tablespoons', 'tbsp', 'volume', 15, true),
  ('cup', 'cups', 'cup', 'volume', 240, false),
  ('floz', 'fluid ounces', 'fl oz', 'volume', 29.5735, false),
  ('oz', 'ounces', 'oz', 'mass', 28.3495, false),
  ('lb', 'pounds', 'lb', 'mass', 453.592, false),
  ('piece', 'pieces', 'piece', 'count', 1, true);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  synonyms text[] not null default '{}',
  aisle text,
  fdc_id integer unique,
  household_id uuid references public.households (id) on delete cascade,
  density_g_per_ml numeric check (density_g_per_ml > 0),
  search_text text not null default '',
  created_at timestamptz not null default now()
);

create function public.ingredients_set_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := lower(new.name) || ' ' || lower(coalesce(array_to_string(new.synonyms, ' '), ''));
  return new;
end;
$$;

create trigger ingredients_search_text
  before insert or update of name, synonyms on public.ingredients
  for each row execute function public.ingredients_set_search_text();

create unique index ingredients_global_name_idx
  on public.ingredients (lower(name)) where household_id is null;
create unique index ingredients_household_name_idx
  on public.ingredients (household_id, lower(name)) where household_id is not null;

create table public.ingredient_portions (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  unit_id text references public.units (id),
  label text,
  grams numeric not null check (grams > 0),
  check (unit_id is not null or label is not null)
);

create index ingredient_portions_ingredient_idx on public.ingredient_portions (ingredient_id);

create table public.ingredient_macros (
  ingredient_id uuid primary key references public.ingredients (id) on delete cascade,
  kcal numeric check (kcal >= 0),
  protein_g numeric check (protein_g >= 0),
  carbs_g numeric check (carbs_g >= 0),
  fat_g numeric check (fat_g >= 0)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  position integer not null default 0
);

create unique index categories_default_name_idx
  on public.categories (lower(name)) where household_id is null;
create unique index categories_household_name_idx
  on public.categories (household_id, lower(name)) where household_id is not null;

insert into public.categories (name, position) values
  ('Breakfast', 1),
  ('Lunch', 2),
  ('Dinner', 3),
  ('Snack', 4),
  ('Dessert', 5),
  ('Drink', 6),
  ('Side', 7);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create unique index tags_household_name_idx on public.tags (household_id, lower(name));

create table public.recipe_sections (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  position integer not null
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  section_id uuid references public.recipe_sections (id) on delete set null,
  position integer not null,
  ingredient_id uuid not null references public.ingredients (id),
  qty_min numeric check (qty_min >= 0),
  qty_max numeric check (qty_max >= 0),
  unit_id text references public.units (id),
  unit_label text,
  grams numeric check (grams >= 0),
  note text,
  optional boolean not null default false,
  raw_text text,
  check (qty_max is null or qty_min is null or qty_max >= qty_min)
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);
create index recipe_ingredients_ingredient_idx on public.recipe_ingredients (ingredient_id);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  section_id uuid references public.recipe_sections (id) on delete set null,
  position integer not null,
  text text not null check (char_length(btrim(text)) between 1 and 1000),
  timer_sec integer check (timer_sec > 0)
);

create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id, position);

create table public.recipe_categories (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (recipe_id, category_id)
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.units enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_portions enable row level security;
alter table public.ingredient_macros enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.recipe_sections enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_categories enable row level security;
alter table public.recipe_tags enable row level security;

create policy "units: read" on public.units for select to authenticated using (true);

create policy "ingredients: read catalog and own household" on public.ingredients
  for select to authenticated
  using (household_id is null or public.is_household_member(household_id));

create policy "ingredients: add own" on public.ingredients
  for insert to authenticated
  with check (household_id is not null and public.is_household_member(household_id));

create policy "ingredients: update own" on public.ingredients
  for update to authenticated
  using (household_id is not null and public.is_household_member(household_id))
  with check (household_id is not null and public.is_household_member(household_id));

create policy "ingredients: delete own" on public.ingredients
  for delete to authenticated
  using (household_id is not null and public.is_household_member(household_id));

create policy "portions: read" on public.ingredient_portions
  for select to authenticated
  using (exists (
    select 1 from public.ingredients i
    where i.id = ingredient_id
      and (i.household_id is null or public.is_household_member(i.household_id))
  ));

create policy "portions: write own" on public.ingredient_portions
  for all to authenticated
  using (exists (
    select 1 from public.ingredients i
    where i.id = ingredient_id and i.household_id is not null and public.is_household_member(i.household_id)
  ))
  with check (exists (
    select 1 from public.ingredients i
    where i.id = ingredient_id and i.household_id is not null and public.is_household_member(i.household_id)
  ));

create policy "macros: read" on public.ingredient_macros
  for select to authenticated
  using (exists (
    select 1 from public.ingredients i
    where i.id = ingredient_id
      and (i.household_id is null or public.is_household_member(i.household_id))
  ));

create policy "macros: write own" on public.ingredient_macros
  for all to authenticated
  using (exists (
    select 1 from public.ingredients i
    where i.id = ingredient_id and i.household_id is not null and public.is_household_member(i.household_id)
  ))
  with check (exists (
    select 1 from public.ingredients i
    where i.id = ingredient_id and i.household_id is not null and public.is_household_member(i.household_id)
  ));

create policy "categories: read defaults and own" on public.categories
  for select to authenticated
  using (household_id is null or public.is_household_member(household_id));

create policy "categories: add own" on public.categories
  for insert to authenticated
  with check (household_id is not null and public.is_household_member(household_id));

create policy "categories: update own" on public.categories
  for update to authenticated
  using (household_id is not null and public.is_household_member(household_id))
  with check (household_id is not null and public.is_household_member(household_id));

create policy "categories: delete own" on public.categories
  for delete to authenticated
  using (household_id is not null and public.is_household_member(household_id));

create policy "tags: members" on public.tags
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "sections: members" on public.recipe_sections
  for all to authenticated
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ))
  with check (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ));

create policy "recipe ingredients: members" on public.recipe_ingredients
  for all to authenticated
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ))
  with check (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ));

create policy "steps: members" on public.recipe_steps
  for all to authenticated
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ))
  with check (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ));

create policy "recipe categories: members" on public.recipe_categories
  for all to authenticated
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ))
  with check (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ));

create policy "recipe tags: members" on public.recipe_tags
  for all to authenticated
  using (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ))
  with check (exists (
    select 1 from public.recipes r where r.id = recipe_id and public.is_household_member(r.household_id)
  ));

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

create function public.search_ingredients(p_query text)
returns table (
  id uuid,
  name text,
  aisle text,
  custom boolean,
  density_g_per_ml numeric,
  portions jsonb
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    i.id,
    i.name,
    i.aisle,
    i.household_id is not null,
    i.density_g_per_ml,
    coalesce((
      select jsonb_agg(jsonb_build_object('label', p.label, 'grams', p.grams, 'unit_id', p.unit_id) order by p.grams)
      from (
        select label, grams, unit_id from public.ingredient_portions
        where ingredient_id = i.id
        order by grams
        limit 6
      ) p
    ), '[]'::jsonb)
  from public.ingredients i
  where length(btrim(coalesce(p_query, ''))) >= 2
    and (
      i.search_text ilike '%' || lower(btrim(p_query)) || '%'
      or i.search_text % lower(btrim(p_query))
    )
  order by
    (i.search_text ilike lower(btrim(p_query)) || '%') desc,
    similarity(i.search_text, lower(btrim(p_query))) desc,
    i.name
  limit 12;
$$;

create function public.search_recipes(
  p_query text default '',
  p_category uuid default null,
  p_has text default null,
  p_lacks text default null,
  p_max_min integer default null,
  p_sort text default 'newest'
)
returns setof public.recipes
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select r.*
  from public.recipes r
  where (
      length(btrim(coalesce(p_query, ''))) = 0
      or r.title ilike '%' || btrim(p_query) || '%'
      or similarity(lower(r.title), lower(btrim(p_query))) > 0.35
      or exists (
        select 1
        from public.recipe_ingredients ri
        join public.ingredients i on i.id = ri.ingredient_id
        where ri.recipe_id = r.id
          and (i.search_text ilike '%' || lower(btrim(p_query)) || '%'
            or similarity(i.search_text, lower(btrim(p_query))) > 0.35)
      )
      or exists (
        select 1
        from public.recipe_tags rt
        join public.tags t on t.id = rt.tag_id
        where rt.recipe_id = r.id and t.name ilike '%' || btrim(p_query) || '%'
      )
    )
    and (
      p_category is null or exists (
        select 1 from public.recipe_categories rc
        where rc.recipe_id = r.id and rc.category_id = p_category
      )
    )
    and (
      p_has is null or length(btrim(p_has)) = 0 or exists (
        select 1
        from public.recipe_ingredients ri
        join public.ingredients i on i.id = ri.ingredient_id
        where ri.recipe_id = r.id and i.search_text ilike '%' || lower(btrim(p_has)) || '%'
      )
    )
    and (
      p_lacks is null or length(btrim(p_lacks)) = 0 or not exists (
        select 1
        from public.recipe_ingredients ri
        join public.ingredients i on i.id = ri.ingredient_id
        where ri.recipe_id = r.id and i.search_text ilike '%' || lower(btrim(p_lacks)) || '%'
      )
    )
    and (p_max_min is null or (r.total_min is not null and r.total_min <= p_max_min))
  order by
    case when p_sort = 'favorites' then r.is_favorite::int end desc nulls last,
    case when p_sort = 'az' then lower(r.title) end asc nulls last,
    case when p_sort = 'newest' or p_sort = 'favorites' then r.created_at end desc nulls last,
    r.title;
$$;

-- ---------------------------------------------------------------------------
-- Writes that touch several tables
-- ---------------------------------------------------------------------------

create function public.create_ingredient(
  p_name text,
  p_kcal numeric default null,
  p_protein numeric default null,
  p_carbs numeric default null,
  p_fat numeric default null
)
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
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select household_id into v_household from public.household_members where user_id = v_uid;
  if v_household is null then
    raise exception 'Create a household first' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'Ingredient name must be 1–200 characters' using errcode = 'P0001';
  end if;

  insert into public.ingredients (name, household_id)
  values (v_name, v_household)
  on conflict (household_id, lower(name)) where household_id is not null
  do update set name = public.ingredients.name
  returning id into v_id;

  if p_kcal is not null or p_protein is not null or p_carbs is not null or p_fat is not null then
    insert into public.ingredient_macros (ingredient_id, kcal, protein_g, carbs_g, fat_g)
    values (v_id, p_kcal, p_protein, p_carbs, p_fat)
    on conflict (ingredient_id) do update
      set kcal = excluded.kcal, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g;
  end if;

  return v_id;
end;
$$;

create function public.create_category(p_name text)
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
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select household_id into v_household from public.household_members where user_id = v_uid;
  if v_household is null then
    raise exception 'Create a household first' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'Category name must be 1–40 characters' using errcode = 'P0001';
  end if;

  insert into public.categories (household_id, name, position)
  values (v_household, v_name, 100)
  on conflict (household_id, lower(name)) where household_id is not null
  do update set name = public.categories.name
  returning id into v_id;
  return v_id;
end;
$$;

-- p_data: {title, description, servings, yield_qty, yield_unit_label, prep_min, cook_min,
--          notes, photo_url, category_ids[], tags[], lines[{type, ...}]}
-- lines in order. A "section" line starts a group; following lines belong to it.
create function public.save_recipe(p_id text, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household uuid;
  v_id uuid;
  v_title text := btrim(coalesce(p_data ->> 'title', ''));
  v_line jsonb;
  v_section uuid;
  v_section_pos int := 0;
  v_ing_pos int := 0;
  v_step_pos int := 0;
  v_ing uuid;
  v_cat uuid;
  v_tag text;
  v_tag_id uuid;
  v_existing uuid := nullif(btrim(coalesce(p_id, '')), '')::uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select household_id into v_household from public.household_members where user_id = v_uid;
  if v_household is null then
    raise exception 'Create a household first' using errcode = 'P0001';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 200 then
    raise exception 'Give the recipe a title' using errcode = 'P0001';
  end if;
  if coalesce((p_data ->> 'servings')::numeric, 0) <= 0 then
    raise exception 'Servings must be greater than 0' using errcode = 'P0001';
  end if;

  if v_existing is null then
    insert into public.recipes (
      household_id, created_by, updated_by, title, description, servings,
      yield_qty, yield_unit_label, prep_min, cook_min, total_min, notes, photo_url
    ) values (
      v_household, v_uid, v_uid, v_title, nullif(btrim(p_data ->> 'description'), ''),
      (p_data ->> 'servings')::numeric,
      nullif(p_data ->> 'yield_qty', '')::numeric,
      nullif(btrim(p_data ->> 'yield_unit_label'), ''),
      nullif(p_data ->> 'prep_min', '')::integer,
      nullif(p_data ->> 'cook_min', '')::integer,
      case
        when p_data ->> 'prep_min' is null and p_data ->> 'cook_min' is null then null
        else coalesce(nullif(p_data ->> 'prep_min', '')::integer, 0)
           + coalesce(nullif(p_data ->> 'cook_min', '')::integer, 0)
      end,
      nullif(btrim(p_data ->> 'notes'), ''),
      nullif(btrim(p_data ->> 'photo_url'), '')
    ) returning id into v_id;
  else
    update public.recipes set
      title = v_title,
      description = nullif(btrim(p_data ->> 'description'), ''),
      servings = (p_data ->> 'servings')::numeric,
      yield_qty = nullif(p_data ->> 'yield_qty', '')::numeric,
      yield_unit_label = nullif(btrim(p_data ->> 'yield_unit_label'), ''),
      prep_min = nullif(p_data ->> 'prep_min', '')::integer,
      cook_min = nullif(p_data ->> 'cook_min', '')::integer,
      total_min = case
        when p_data ->> 'prep_min' is null and p_data ->> 'cook_min' is null then null
        else coalesce(nullif(p_data ->> 'prep_min', '')::integer, 0)
           + coalesce(nullif(p_data ->> 'cook_min', '')::integer, 0)
      end,
      notes = nullif(btrim(p_data ->> 'notes'), ''),
      photo_url = nullif(btrim(p_data ->> 'photo_url'), ''),
      updated_by = v_uid
    where id = v_existing and household_id = v_household
    returning id into v_id;
    if v_id is null then
      raise exception 'Recipe not found' using errcode = 'P0001';
    end if;
    delete from public.recipe_ingredients where recipe_id = v_id;
    delete from public.recipe_steps where recipe_id = v_id;
    delete from public.recipe_sections where recipe_id = v_id;
    delete from public.recipe_categories where recipe_id = v_id;
    delete from public.recipe_tags where recipe_id = v_id;
  end if;

  for v_line in select value from jsonb_array_elements(coalesce(p_data -> 'lines', '[]'::jsonb))
  loop
    if v_line ->> 'type' = 'section' then
      v_section_pos := v_section_pos + 1;
      insert into public.recipe_sections (recipe_id, title, position)
      values (v_id, btrim(v_line ->> 'title'), v_section_pos)
      returning id into v_section;
    elsif v_line ->> 'type' = 'ingredient' then
      v_ing := (v_line ->> 'ingredient_id')::uuid;
      if not exists (
        select 1 from public.ingredients i
        where i.id = v_ing and (i.household_id is null or i.household_id = v_household)
      ) then
        raise exception 'That ingredient is not in your catalog' using errcode = 'P0001';
      end if;
      v_ing_pos := v_ing_pos + 1;
      insert into public.recipe_ingredients (
        recipe_id, section_id, position, ingredient_id, qty_min, qty_max, unit_id,
        unit_label, grams, note, optional, raw_text
      ) values (
        v_id, v_section, v_ing_pos, v_ing,
        nullif(v_line ->> 'qty_min', '')::numeric,
        nullif(v_line ->> 'qty_max', '')::numeric,
        nullif(v_line ->> 'unit_id', ''),
        nullif(btrim(v_line ->> 'unit_label'), ''),
        nullif(v_line ->> 'grams', '')::numeric,
        nullif(btrim(v_line ->> 'note'), ''),
        coalesce((v_line ->> 'optional')::boolean, false),
        nullif(btrim(v_line ->> 'raw_text'), '')
      );
    elsif v_line ->> 'type' = 'step' then
      if char_length(btrim(coalesce(v_line ->> 'text', ''))) < 1 then
        continue;
      end if;
      v_step_pos := v_step_pos + 1;
      insert into public.recipe_steps (recipe_id, section_id, position, text, timer_sec)
      values (
        v_id, v_section, v_step_pos, btrim(v_line ->> 'text'),
        nullif(v_line ->> 'timer_sec', '')::integer
      );
    end if;
  end loop;

  if v_ing_pos = 0 then
    raise exception 'Add at least one ingredient' using errcode = 'P0001';
  end if;

  for v_cat in select (value #>> '{}')::uuid from jsonb_array_elements(coalesce(p_data -> 'category_ids', '[]'::jsonb))
  loop
    if exists (
      select 1 from public.categories c
      where c.id = v_cat and (c.household_id is null or c.household_id = v_household)
    ) then
      insert into public.recipe_categories (recipe_id, category_id) values (v_id, v_cat)
      on conflict do nothing;
    end if;
  end loop;

  for v_tag in select btrim(value #>> '{}') from jsonb_array_elements(coalesce(p_data -> 'tags', '[]'::jsonb))
  loop
    if char_length(v_tag) < 1 or char_length(v_tag) > 40 then
      continue;
    end if;
    select id into v_tag_id from public.tags
    where household_id = v_household and lower(name) = lower(v_tag);
    if v_tag_id is null then
      insert into public.tags (household_id, name) values (v_household, v_tag) returning id into v_tag_id;
    end if;
    insert into public.recipe_tags (recipe_id, tag_id) values (v_id, v_tag_id) on conflict do nothing;
    v_tag_id := null;
  end loop;

  return v_id;
end;
$$;

revoke execute on function
  public.search_ingredients(text),
  public.search_recipes(text, uuid, text, text, integer, text),
  public.create_ingredient(text, numeric, numeric, numeric, numeric),
  public.create_category(text),
  public.save_recipe(text, jsonb)
from public, anon;

grant execute on function
  public.search_ingredients(text),
  public.search_recipes(text, uuid, text, text, integer, text),
  public.create_ingredient(text, numeric, numeric, numeric, numeric),
  public.create_category(text),
  public.save_recipe(text, jsonb)
to authenticated;
