"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/supabase/database.types";
import { requireUser } from "@/lib/data";

export type IngredientHit = {
  id: string;
  name: string;
  aisle: string | null;
  density: number | null;
  portions: { label: string | null; grams: number; unitId: string | null }[];
};

export async function searchIngredients(query: string): Promise<IngredientHit[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("search_ingredients", { p_query: query });
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
    },
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath(`/recipes/${data}`);
  redirect(`/recipes/${data}`);
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
