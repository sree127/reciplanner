"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/data";

export async function createList(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_shopping_list", { p_name: name });
  if (error) redirect(`/lists?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/lists");
  redirect(`/lists/${data}`);
}

export async function renameList(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const { supabase } = await requireUser();
  if (name) await supabase.from("shopping_lists").update({ name }).eq("id", id);
  revalidatePath("/lists");
  revalidatePath(`/lists/${id}`);
}

export async function deleteList(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const { supabase } = await requireUser();
  await supabase.from("shopping_lists").delete().eq("id", id);
  revalidatePath("/lists");
  redirect("/lists");
}

export async function setDefaultList(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const { supabase } = await requireUser();
  await supabase.rpc("set_default_list", { p_list_id: id });
  revalidatePath("/lists");
  revalidatePath(`/lists/${id}`);
}

export async function addManualItem(formData: FormData): Promise<void> {
  const listId = String(formData.get("listId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const { supabase } = await requireUser();
  if (name) await supabase.rpc("add_manual_item", { p_list_id: listId, p_name: name });
  revalidatePath(`/lists/${listId}`);
}

export async function clearChecked(formData: FormData): Promise<void> {
  const listId = String(formData.get("listId") ?? "");
  const { supabase } = await requireUser();
  await supabase.rpc("clear_checked_items", { p_list_id: listId });
  revalidatePath(`/lists/${listId}`);
}

/** Add a single recipe ingredient to a chosen list, scaled to the shown servings. */
export async function addIngredientToList(
  listId: string,
  recipeIngredientId: string,
  servings: number,
): Promise<{ name: string } | { error: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("add_ingredient_to_list", {
    p_list_id: listId,
    p_recipe_ingredient_id: recipeIngredientId,
    p_servings: servings,
  });
  if (error) return { error: error.message };
  revalidatePath(`/lists/${listId}`);
  revalidatePath("/lists");
  return { name: data ?? "Ingredient" };
}
