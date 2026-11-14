"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aiAvailable, aiEstimateMacros } from "@/lib/ai";
import { requireUser } from "@/lib/data";
import { formatScaled } from "@/lib/kitchen";
import { addMacros, type EstimateLine, perServingMacros, roundMacros, sumIngredientMacros } from "@/lib/nutrition";
import type { Json } from "@/lib/supabase/database.types";

export type IngredientHit = {
  id: string;
  name: string;
  aisle: string | null;
  density: number | null;
  portions: { label: string | null; grams: number; unitId: string | null }[];
};

export async function searchIngredients(query: string, all = false): Promise<IngredientHit[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("search_ingredients", { p_query: query, p_all: all });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    aisle: row.aisle,
    density: row.density_g_per_ml == null ? null : Number(row.density_g_per_ml),
    portions: (Array.isArray(row.portions) ? row.portions : []).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const portion = item as { label?: string | null; grams?: number | string; unit_id?: string | null };
      const grams = Number(portion.grams);
      if (!Number.isFinite(grams)) return [];
      return [{ label: portion.label ?? null, grams, unitId: portion.unit_id ?? null }];
    }),
  }));
}

export async function createIngredient(name: string, macros?: { kcal?: number; protein?: number; carbs?: number; fat?: number }) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_ingredient", {
    p_name: name,
    p_kcal: macros?.kcal,
    p_protein: macros?.protein,
    p_carbs: macros?.carbs,
    p_fat: macros?.fat,
  });
  if (error) return { error: error.message };
  return { id: data };
}

export async function createCategory(name: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_category", { p_name: name });
  if (error) return { error: error.message };
  return { id: data, name: name.trim() };
}

export async function saveRecipe(payload: {
  id?: string;
  title: string;
  description: string;
  servings: number;
  yield_qty: number | null;
  yield_unit_label: string;
  prep_min: number | null;
  cook_min: number | null;
  notes: string;
  photo_url: string;
  category_ids: string[];
  tags: string[];
  lines: Json[];
  source_url?: string;
  source_type?: string;
  source_author?: string;
  steps_style?: string;
}): Promise<{ error: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("save_recipe", {
    p_id: payload.id ?? "",
    p_data: {
      title: payload.title,
      description: payload.description,
      servings: payload.servings,
      yield_qty: payload.yield_qty,
      yield_unit_label: payload.yield_unit_label,
      prep_min: payload.prep_min,
      cook_min: payload.cook_min,
      notes: payload.notes,
      photo_url: payload.photo_url,
      category_ids: payload.category_ids,
      tags: payload.tags,
      lines: payload.lines,
      source_url: payload.source_url ?? "",
      source_type: payload.source_type ?? "",
      source_author: payload.source_author ?? "",
      steps_style: payload.steps_style ?? "",
    },
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath(`/recipes/${data}`);
  redirect(`/recipes/${data}`);
}

export type NutritionInput = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

/** Save per-serving macros as a manual override. Clearing every field drops back to the estimate. */
export async function saveNutrition(
  recipeId: string,
  values: NutritionInput,
): Promise<{ ok: true } | { error: string }> {
  const { supabase } = await requireUser();
  const clean = (v: number | null) => (v != null && Number.isFinite(v) && v >= 0 ? v : null);
  const kcal = clean(values.kcal);
  const protein = clean(values.protein);
  const carbs = clean(values.carbs);
  const fat = clean(values.fat);
  const allEmpty = kcal == null && protein == null && carbs == null && fat == null;
  const { error } = await supabase
    .from("recipes")
    .update({
      nutrition_source: allEmpty ? null : "manual",
      nutrition_kcal: kcal,
      nutrition_protein_g: protein,
      nutrition_carbs_g: carbs,
      nutrition_fat_g: fat,
    })
    .eq("id", recipeId);
  if (error) return { error: error.message };
  revalidatePath(`/recipes/${recipeId}`);
  return { ok: true };
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Estimate per-serving macros, metric. The ingredient macro database (per 100 g) is the source
 * of truth: each weighed line contributes (grams / 100) × per-100g, summed and divided by
 * servings. Gemini only fills in the lines the database can't measure (no weight or no macros,
 * e.g. "2 piece Tomato"), so believable staples like 400 g tofu are never under-counted. Falls
 * back to the database-only total when no key is set or the call fails. Does not save.
 */
export async function estimateNutrition(
  recipeId: string,
): Promise<{ values: NutritionInput } | { error: string }> {
  const { supabase } = await requireUser();
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .select("title, servings")
    .eq("id", recipeId)
    .maybeSingle();
  if (recipeError) return { error: recipeError.message };
  if (!recipe) return { error: "Recipe not found." };

  const { data: lines, error: linesError } = await supabase
    .from("recipe_ingredients")
    .select("qty_min, qty_max, unit_id, unit_label, grams, optional, ingredient_id, ingredients(name)")
    .eq("recipe_id", recipeId)
    .order("position");
  if (linesError) return { error: linesError.message };
  const rows = lines ?? [];

  const macroIds = [...new Set(rows.map((r) => r.ingredient_id))];
  const macroByIngredient = new Map<
    string,
    { kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }
  >();
  if (macroIds.length) {
    const { data: macroRows, error: macroError } = await supabase
      .from("ingredient_macros")
      .select("ingredient_id, kcal, protein_g, carbs_g, fat_g")
      .in("ingredient_id", macroIds);
    if (macroError) return { error: macroError.message };
    for (const row of macroRows ?? []) macroByIngredient.set(row.ingredient_id, row);
  }

  const estimateLines: EstimateLine[] = rows.map((r) => ({
    name: r.ingredients?.name ?? "Ingredient",
    grams: toNumber(r.grams),
    optional: r.optional,
    per100g: macroByIngredient.get(r.ingredient_id) ?? null,
  }));
  const { total, counted } = sumIngredientMacros(estimateLines);

  // Lines the database couldn't measure → let Gemini approximate just those.
  const unknown: string[] = [];
  rows.forEach((r, i) => {
    const line = estimateLines[i];
    if (line.optional) return;
    const countable = line.grams != null && line.grams > 0 && line.per100g != null && line.per100g.kcal != null;
    if (countable) return;
    const text = `${formatScaled(toNumber(r.qty_min), toNumber(r.qty_max), r.unit_id, r.unit_label, 1)} ${r.ingredients?.name ?? ""}`.trim();
    if (text) unknown.push(text);
  });

  let combined = total;
  let usedAi = false;
  if (unknown.length > 0 && aiAvailable()) {
    const aiTotal = await aiEstimateMacros(recipe.title ?? "Recipe", unknown);
    if (aiTotal) {
      combined = addMacros(total, aiTotal);
      usedAi = true;
    }
  }

  if (counted === 0 && !usedAi) {
    return {
      error: aiAvailable()
        ? "Couldn't estimate nutrition just now. Try again or enter the values yourself."
        : "No macro data for these ingredients yet. Add a Gemini key to estimate them, or enter the values yourself.",
    };
  }

  const servings = toNumber(recipe.servings) ?? 1;
  const values = roundMacros(perServingMacros(combined, servings));
  return { values };
}

export async function toggleFavorite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("favorite") === "true";
  const { supabase } = await requireUser();
  await supabase.from("recipes").update({ is_favorite: next }).eq("id", id);
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
}

export async function deleteRecipe(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("recipes").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/");
  redirect("/");
}
