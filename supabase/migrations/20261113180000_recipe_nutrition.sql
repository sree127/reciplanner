-- Per-serving nutrition stored on a recipe, used when the source already publishes it.
-- When these are null, the app falls back to its ingredient-based estimate (src/lib/recipes.ts).
-- Values are per serving, matching how recipe sites report schema.org NutritionInformation.

alter table public.recipes
  add column nutrition_source text check (nutrition_source in ('web', 'manual')),
  add column nutrition_kcal numeric check (nutrition_kcal >= 0),
  add column nutrition_protein_g numeric check (nutrition_protein_g >= 0),
  add column nutrition_carbs_g numeric check (nutrition_carbs_g >= 0),
  add column nutrition_fat_g numeric check (nutrition_fat_g >= 0);
