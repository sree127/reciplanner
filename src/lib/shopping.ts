import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data";

export type ShoppingListSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  itemCount: number;
  checkedCount: number;
};

export type ShoppingItem = {
  id: string;
  name: string;
  aisle: string;
  qtyMin: number | null;
  qtyMax: number | null;
  unitId: string | null;
  unitLabel: string | null;
  checked: boolean;
  position: number;
  recipes: string[];
};

export type ShoppingListDetail = {
  id: string;
  name: string;
  isDefault: boolean;
  items: ShoppingItem[];
};

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const NO_AISLE = "Other";

export async function getShoppingLists(): Promise<ShoppingListSummary[]> {
  const { supabase } = await requireUser();
  const { data: lists, error } = await supabase
    .from("shopping_lists")
    .select("id, name, is_default, created_at")
    .order("is_default", { ascending: false })
    .order("created_at");
  if (error) throw error;
  if (!lists?.length) return [];

  const ids = lists.map((l) => l.id);
  const { data: items, error: itemError } = await supabase
    .from("shopping_list_items")
    .select("list_id, checked")
    .in("list_id", ids);
  if (itemError) throw itemError;

  const counts = new Map<string, { total: number; checked: number }>();
  for (const item of items ?? []) {
    const c = counts.get(item.list_id) ?? { total: 0, checked: 0 };
    c.total += 1;
    if (item.checked) c.checked += 1;
    counts.set(item.list_id, c);
  }

  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    isDefault: l.is_default,
    itemCount: counts.get(l.id)?.total ?? 0,
    checkedCount: counts.get(l.id)?.checked ?? 0,
  }));
}

/** Lists for the "Add to list" picker: default first, then by name. */
export async function getListsForPicker(): Promise<{ id: string; name: string; isDefault: boolean }[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("id, name, is_default")
    .order("is_default", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []).map((l) => ({ id: l.id, name: l.name, isDefault: l.is_default }));
}

export async function getList(id: string): Promise<ShoppingListDetail> {
  const { supabase } = await requireUser();
  const { data: list, error } = await supabase
    .from("shopping_lists")
    .select("id, name, is_default")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!list) notFound();

  const { data: items, error: itemError } = await supabase
    .from("shopping_list_items")
    .select("id, name, aisle, qty_min, qty_max, unit_id, unit_label, checked, position")
    .eq("list_id", id)
    .order("position");
  if (itemError) throw itemError;

  const itemIds = (items ?? []).map((i) => i.id);
  const recipesByItem = new Map<string, string[]>();
  if (itemIds.length) {
    const { data: sources, error: sourceError } = await supabase
      .from("shopping_list_item_sources")
      .select("item_id, recipe_title")
      .in("item_id", itemIds);
    if (sourceError) throw sourceError;
    for (const s of sources ?? []) {
      if (!s.recipe_title) continue;
      const list = recipesByItem.get(s.item_id) ?? [];
      if (!list.includes(s.recipe_title)) list.push(s.recipe_title);
      recipesByItem.set(s.item_id, list);
    }
  }

  return {
    id: list.id,
    name: list.name,
    isDefault: list.is_default,
    items: (items ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      aisle: i.aisle?.trim() || NO_AISLE,
      qtyMin: num(i.qty_min),
      qtyMax: num(i.qty_max),
      unitId: i.unit_id,
      unitLabel: i.unit_label,
      checked: i.checked,
      position: i.position,
      recipes: recipesByItem.get(i.id) ?? [],
    })),
  };
}
