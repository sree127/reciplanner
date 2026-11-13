"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aiAvailable, aiEstimateNutrition } from "@/lib/ai";
import { requireUser } from "@/lib/data";
import { formatScaled } from "@/lib/kitchen";
import { getRecipe } from "@/lib/recipes";
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

/** Estimate per-serving macros from the recipe's ingredients with Gemini. Does not save. */
export async function estimateNutrition(
  recipeId: string,
): Promise<{ values: NutritionInput } | { error: string }> {
  if (!aiAvailable()) {
    return { error: "Nutrition estimates aren't set up. Enter the values yourself." };
  }
  const recipe = await getRecipe(recipeId);
  const ingredients = recipe.ingredients
    .filter((line) => !line.optional)
    .map((line) => `${formatScaled(line.qtyMin, line.qtyMax, line.unitId, line.unitLabel, 1)} ${line.name}`.trim())
    .filter(Boolean);
  if (ingredients.length === 0) {
    return { error: "Add some ingredients first, then estimate." };
  }
  const result = await aiEstimateNutrition(recipe.title, recipe.servings, ingredients);
  if (!result) {
    return { error: "Couldn't estimate nutrition just now. Try again or enter the values yourself." };
  }
  return {
    values: {
      kcal: Math.round(result.kcal),
      protein: Math.round(result.protein * 10) / 10,
      carbs: Math.round(result.carbs * 10) / 10,
      fat: Math.round(result.fat * 10) / 10,
    },
  };
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
