"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMyHousehold, requireUser } from "@/lib/data";
import { importFromUrl, type ParsedIngredient } from "@/lib/import";
import { convertQuantity } from "@/lib/kitchen";
import { searchIngredients } from "@/app/(app)/recipes/actions";
import type { Json } from "@/lib/supabase/database.types";

function toImport(error: string): never {
  redirect(`/import?error=${encodeURIComponent(error)}`);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Accept a catalog match only when it clearly refers to the same thing. Deliberately
 * conservative: a shared single word (e.g. "paste") is not enough, so weak guesses become
 * new household ingredients instead of silently mislabelling the line. */
function isConfident(name: string, hitName: string): boolean {
  const a = normalize(name);
  const b = normalize(hitName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

async function matchIngredient(name: string): Promise<{ id: string; density: number | null } | null> {
  const query = name.trim();
  if (query.length < 2) return null;
  let hits = await searchIngredients(query);
  let hit = hits.find((h) => isConfident(query, h.name));
  if (!hit) {
    hits = await searchIngredients(query, true);
    hit = hits.find((h) => isConfident(query, h.name));
  }
  return hit ? { id: hit.id, density: hit.density } : null;
}

/** Build a recipe ingredient line, converting the parsed quantity to metric. Lines whose
 * quantity can't be parsed are kept with their original text so nothing is dropped. */
function buildLine(ingredientId: string, ing: ParsedIngredient, density: number | null, toTaste: boolean): Json {
  const base: Record<string, Json> = {
    type: "ingredient",
    ingredient_id: ingredientId,
    note: ing.note || "",
    raw_text: ing.raw,
  };
  if (toTaste) return { ...base, unit_label: "to taste" };
  if (ing.qtyText && ing.unitToken) {
    const conv = convertQuantity({ qtyText: ing.qtyText, unitToken: ing.unitToken, density, toTaste: false });
    if (!("error" in conv)) {
      return {
        ...base,
        qty_min: conv.qtyMin,
        qty_max: conv.qtyMax,
        unit_id: conv.unitId,
        unit_label: conv.unitLabel,
        grams: conv.grams,
      };
    }
  }
  return base;
}

/** Paste a link and get a saved recipe in one step: fetch the page, read its recipe data,
 * convert the ingredients to metric, match them to the catalog (creating a household
 * ingredient for anything unmatched), condense the steps, and save. Lands on the recipe. */
export async function startImport(formData: FormData): Promise<void> {
  const url = String(formData.get("url") ?? "").trim();
  if (!url) toImport("Paste a recipe link first.");

  const { supabase } = await requireUser();
  const household = await getMyHousehold();
  if (!household) redirect("/");

  const result = await importFromUrl(url);
  if ("error" in result) toImport(result.error);

  const lines: Json[] = [];
  let created = 0;
  for (const ing of result.ingredients) {
    const name = (ing.name || ing.raw).trim();
    if (!name) continue;
    const toTaste = !ing.qtyText && /to taste/i.test(`${ing.note} ${ing.raw}`);

    const match = await matchIngredient(name);
    let ingredientId = match?.id ?? null;
    const density = match?.density ?? null;
    if (!ingredientId) {
      const { data, error } = await supabase.rpc("create_ingredient", { p_name: name.slice(0, 200) });
      if (error || !data) continue;
      ingredientId = data;
      created += 1;
    }
    lines.push(buildLine(ingredientId, ing, density, toTaste));
  }

  if (!lines.length) toImport("No ingredients were found on that page. You can still add the recipe by hand.");

  for (const text of result.steps) {
    const trimmed = text.trim();
    if (trimmed) lines.push({ type: "step", text: trimmed.slice(0, 1000) });
  }

  const { data: id, error } = await supabase.rpc("save_recipe", {
    p_id: "",
    p_data: {
      title: result.title || "Imported recipe",
      description: result.description || "",
      servings: result.servings && result.servings > 0 ? result.servings : 4,
      yield_qty: null,
      yield_unit_label: "",
      prep_min: result.prepMin,
      cook_min: result.cookMin,
      notes: "",
      photo_url: result.photoUrl || "",
      category_ids: [],
      tags: [],
      lines,
      source_url: result.sourceUrl || url,
      source_type: "web",
      source_author: result.sourceAuthor || "",
      steps_style: "short",
    },
  });
  if (error || !id) toImport(error?.message ?? "Could not save the imported recipe.");

  // If the page published its own nutrition (per serving), keep it — it's more reliable
  // than estimating from ingredients, especially when units don't convert to grams.
  if (result.nutrition) {
    await supabase
      .from("recipes")
      .update({
        nutrition_source: "web",
        nutrition_kcal: result.nutrition.kcal,
        nutrition_protein_g: result.nutrition.protein,
        nutrition_carbs_g: result.nutrition.carbs,
        nutrition_fat_g: result.nutrition.fat,
      })
      .eq("id", id);
  }

  revalidatePath("/");
  redirect(`/recipes/${id}?imported=${created}`);
}
