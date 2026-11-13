"use server";

import { redirect } from "next/navigation";
import { getMyHousehold, requireUser } from "@/lib/data";
import { importFromUrl, type ParsedIngredient } from "@/lib/import";
import { searchIngredients, type IngredientHit } from "@/app/(app)/recipes/actions";

export type ReviewIngredient = {
  qtyText: string;
  unitToken: string;
  name: string;
  note: string;
  toTaste: boolean;
  ingredientId: string | null;
  matchedName: string | null;
  density: number | null;
  portions: IngredientHit["portions"];
};

export type ReviewData = {
  title: string;
  description: string;
  servings: string;
  prepMin: string;
  cookMin: string;
  photoUrl: string;
  sourceUrl: string;
  sourceAuthor: string;
  usedAi: boolean;
  unmatched: number;
  ingredients: ReviewIngredient[];
  steps: string[];
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Accept a catalog hit only when it clearly refers to the same thing, so weak guesses
 * are left for the cook to confirm on the review screen. Deliberately conservative: a
 * shared single word (e.g. "paste") is not enough. */
function isConfident(name: string, hitName: string): boolean {
  const a = normalize(name);
  const b = normalize(hitName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

async function matchIngredient(ing: ParsedIngredient): Promise<ReviewIngredient> {
  const toTaste = !ing.qtyText && /to taste/i.test(`${ing.note} ${ing.raw}`);
  const base: ReviewIngredient = {
    qtyText: ing.qtyText,
    unitToken: ing.unitToken || (toTaste ? "" : "g"),
    name: ing.name || ing.raw,
    note: ing.note,
    toTaste,
    ingredientId: null,
    matchedName: null,
    density: null,
    portions: [],
  };
  const query = (ing.name || ing.raw).trim();
  if (query.length < 2) return base;

  let hits = await searchIngredients(query);
  let hit = hits.find((h) => isConfident(query, h.name));
  if (!hit) {
    hits = await searchIngredients(query, true);
    hit = hits.find((h) => isConfident(query, h.name));
  }
  if (!hit) return base;
  return {
    ...base,
    ingredientId: hit.id,
    matchedName: hit.name,
    density: hit.density,
    portions: hit.portions,
  };
}

export async function startImport(formData: FormData): Promise<void> {
  const url = String(formData.get("url") ?? "").trim();
  const { supabase, userId } = await requireUser();
  const household = await getMyHousehold();
  if (!household) redirect("/");

  const { data: job, error } = await supabase
    .from("import_jobs")
    .insert({ household_id: household.id, created_by: userId, url, source_type: "web", status: "pending" })
    .select("id")
    .single();
  if (error || !job) throw error ?? new Error("Could not start the import.");

  const result = await importFromUrl(url);
  if ("error" in result) {
    await supabase.from("import_jobs").update({ status: "error", error: result.error }).eq("id", job.id);
    redirect(`/import/${job.id}`);
  }

  const ingredients = await Promise.all(result.ingredients.map(matchIngredient));
  const review: ReviewData = {
    title: result.title,
    description: result.description,
    servings: result.servings ? String(result.servings) : "4",
    prepMin: result.prepMin != null ? String(result.prepMin) : "",
    cookMin: result.cookMin != null ? String(result.cookMin) : "",
    photoUrl: result.photoUrl,
    sourceUrl: result.sourceUrl,
    sourceAuthor: result.sourceAuthor,
    usedAi: result.usedAi,
    unmatched: ingredients.filter((i) => !i.ingredientId).length,
    ingredients,
    steps: result.steps,
  };
  await supabase.from("import_jobs").update({ status: "done", parsed_json: review }).eq("id", job.id);
  redirect(`/import/${job.id}`);
}
