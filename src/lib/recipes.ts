import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data";

export type RecipeCard = {
  id: string;
  title: string;
  servings: number | null;
  totalMin: number | null;
  photoUrl: string | null;
  favorite: boolean;
  categories: string[];
};

export type IngredientLine = {
  key: string;
  sectionId: string | null;
  qtyMin: number | null;
  qtyMax: number | null;
  unitId: string | null;
  unitLabel: string | null;
  grams: number | null;
  note: string | null;
  optional: boolean;
  name: string;
  ingredientId: string;
};

export type StepLine = { key: string; sectionId: string | null; text: string; timerSec: number | null };

export type SectionLine = { key: string; title: string };

export type RecipeDetail = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  yieldQty: number | null;
  yieldLabel: string | null;
  prepMin: number | null;
  cookMin: number | null;
  totalMin: number | null;
  notes: string | null;
  photoUrl: string | null;
  favorite: boolean;
  author: string | null;
  categories: { id: string; name: string }[];
  tags: string[];
  sections: SectionLine[];
  ingredients: IngredientLine[];
  steps: StepLine[];
};

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function searchRecipeCards(filters: {
  query: string;
  category: string | null;
  has: string;
  lacks: string;
  maxMin: number | null;
  sort: string;
}): Promise<RecipeCard[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("search_recipes", {
    p_query: filters.query,
    p_category: filters.category ?? undefined,
    p_has: filters.has,
    p_lacks: filters.lacks,
    p_max_min: filters.maxMin ?? undefined,
    p_sort: filters.sort,
  });
  if (error) throw error;
  const recipes = data ?? [];
  const ids = recipes.map((r) => r.id);
  const categories = new Map<string, string[]>();
  if (ids.length) {
    const { data: links, error: linkError } = await supabase
      .from("recipe_categories")
      .select("recipe_id, categories(name)")
      .in("recipe_id", ids);
    if (linkError) throw linkError;
    for (const link of links) {
      const name = link.categories?.name;
      if (!name) continue;
      categories.set(link.recipe_id, [...(categories.get(link.recipe_id) ?? []), name]);
    }
  }
  return recipes.map((r) => ({
    id: r.id,
    title: r.title,
    servings: num(r.servings),
    totalMin: r.total_min,
    photoUrl: r.photo_url,
    favorite: r.is_favorite,
    categories: categories.get(r.id) ?? [],
  }));
}

export async function getCategories() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("categories").select("id, name, household_id").order("position").order("name");
  if (error) throw error;
  return data;
}

export async function getRecipe(id: string): Promise<RecipeDetail> {
  const { supabase } = await requireUser();
  const { data: recipe, error } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!recipe) notFound();

  const [sections, ingredients, steps, categories, tags, author] = await Promise.all([
    supabase.from("recipe_sections").select("id, title, position").eq("recipe_id", id).order("position"),
    supabase
      .from("recipe_ingredients")
      .select("id, section_id, ingredient_id, qty_min, qty_max, unit_id, unit_label, grams, note, optional, position, ingredients(name)")
      .eq("recipe_id", id)
      .order("position"),
    supabase.from("recipe_steps").select("id, section_id, text, timer_sec, position").eq("recipe_id", id).order("position"),
    supabase.from("recipe_categories").select("category_id, categories(id, name)").eq("recipe_id", id),
    supabase.from("recipe_tags").select("tags(name)").eq("recipe_id", id),
    recipe.created_by
      ? supabase.from("profiles").select("name, email").eq("id", recipe.created_by).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const result of [sections, ingredients, steps, categories, tags, author]) {
    if (result.error) throw result.error;
  }

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    servings: num(recipe.servings) ?? 1,
    yieldQty: num(recipe.yield_qty),
    yieldLabel: recipe.yield_unit_label,
    prepMin: recipe.prep_min,
    cookMin: recipe.cook_min,
    totalMin: recipe.total_min,
    notes: recipe.notes,
    photoUrl: recipe.photo_url,
    favorite: recipe.is_favorite,
    author: author.data?.name || author.data?.email?.split("@")[0] || null,
    categories: (categories.data ?? []).flatMap((c) => (c.categories ? [c.categories] : [])),
    tags: (tags.data ?? []).flatMap((t) => (t.tags?.name ? [t.tags.name] : [])),
    sections: (sections.data ?? []).map((s) => ({ key: s.id, title: s.title })),
    ingredients: (ingredients.data ?? []).map((line) => ({
      key: line.id,
      sectionId: line.section_id,
      qtyMin: num(line.qty_min),
      qtyMax: num(line.qty_max),
      unitId: line.unit_id,
      unitLabel: line.unit_label,
      grams: num(line.grams),
      note: line.note,
      optional: line.optional,
      name: line.ingredients?.name ?? "Ingredient",
      ingredientId: line.ingredient_id,
    })),
    steps: (steps.data ?? []).map((s) => ({
      key: s.id,
      sectionId: s.section_id,
      text: s.text,
      timerSec: s.timer_sec,
    })),
  };
}
