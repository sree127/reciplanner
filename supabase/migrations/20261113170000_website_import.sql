-- Milestone: website recipe import.
-- An import job records a pasted link and the parsed result so the review screen can load it.
-- save_recipe gains source fields so an imported recipe links back to its original page.

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  url text not null,
  source_type public.recipe_source_type not null default 'web',
  status text not null default 'pending' check (status in ('pending', 'done', 'error')),
  raw_text text,
  parsed_json jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index import_jobs_household_idx on public.import_jobs (household_id, created_at desc);

alter table public.import_jobs enable row level security;

create policy "import jobs: members" on public.import_jobs
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- save_recipe gains source fields (source_url, source_type, source_author, steps_style).
-- On update, each source field is preserved when the payload does not provide it, so
-- editing an imported recipe keeps its link back to the original page.
-- ---------------------------------------------------------------------------

create or replace function public.save_recipe(p_id text, p_data jsonb)
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
      yield_qty, yield_unit_label, prep_min, cook_min, total_min, notes, photo_url,
      source_url, source_type, source_author, steps_style
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
      nullif(btrim(p_data ->> 'photo_url'), ''),
      nullif(btrim(p_data ->> 'source_url'), ''),
      coalesce(nullif(p_data ->> 'source_type', ''), 'manual')::public.recipe_source_type,
      nullif(btrim(p_data ->> 'source_author'), ''),
      coalesce(nullif(p_data ->> 'steps_style', ''), 'full')::public.recipe_steps_style
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
      source_url = coalesce(nullif(btrim(p_data ->> 'source_url'), ''), source_url),
      source_type = coalesce(nullif(p_data ->> 'source_type', '')::public.recipe_source_type, source_type),
      source_author = coalesce(nullif(btrim(p_data ->> 'source_author'), ''), source_author),
      steps_style = coalesce(nullif(p_data ->> 'steps_style', '')::public.recipe_steps_style, steps_style),
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
