-- Search shows friendly common ingredients and the household's own additions by default.
-- Pass p_all => true to reach the full USDA catalog.

drop function if exists public.search_ingredients(text);

create function public.search_ingredients(p_query text, p_all boolean default false)
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
    and (p_all or i.is_common or i.household_id is not null)
    and (
      i.search_text ilike '%' || lower(btrim(p_query)) || '%'
      or i.search_text % lower(btrim(p_query))
    )
  order by
    (i.search_text ilike lower(btrim(p_query)) || '%') desc,
    i.is_common desc,
    i.household_id is not null desc,
    similarity(i.search_text, lower(btrim(p_query))) desc,
    length(i.name),
    i.name
  limit 15;
$$;

revoke execute on function public.search_ingredients(text, boolean) from public, anon;
grant execute on function public.search_ingredients(text, boolean) to authenticated;
