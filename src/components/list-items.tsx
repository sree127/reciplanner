"use client";

import { useCallback, useEffect, useState } from "react";
import { formatScaled } from "@/lib/kitchen";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { ShoppingItem } from "@/lib/shopping";
import { SubmitButton } from "@/components/submit-button";
import { addManualItem, clearChecked } from "@/app/(app)/lists/actions";

const AISLE_ORDER = ["Produce", "Bakery", "Dairy", "Meat", "Fish", "Frozen", "Pantry", "Spices", "Drinks", "Household", "Other"];

function aisleRank(aisle: string): number {
  const i = AISLE_ORDER.indexOf(aisle);
  return i === -1 ? AISLE_ORDER.length - 1 : i;
}

type Props = {
  listId: string;
  initialItems: ShoppingItem[];
  config: { url: string; key: string };
};

export function ListItems({ listId, initialItems, config }: Props) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [supabase] = useState(() => createBrowserSupabase(config.url, config.key));

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("shopping_list_items")
      .select("id, name, aisle, qty_min, qty_max, unit_id, unit_label, checked, position")
      .eq("list_id", listId)
      .order("position");
    if (!data) return;
    setItems((prev) => {
      const recipesById = new Map(prev.map((p) => [p.id, p.recipes]));
      return data.map((i) => ({
        id: i.id,
        name: i.name,
        aisle: i.aisle?.trim() || "Other",
        qtyMin: i.qty_min == null ? null : Number(i.qty_min),
        qtyMax: i.qty_max == null ? null : Number(i.qty_max),
        unitId: i.unit_id,
        unitLabel: i.unit_label,
        checked: i.checked,
        position: i.position,
        recipes: recipesById.get(i.id) ?? [],
      }));
    });
  }, [supabase, listId]);

  // Live sync: react to any change on this list, and poll as a fallback for environments
  // where realtime isn't available so a partner's tick still shows within a few seconds.
  useEffect(() => {
    const channel = supabase
      .channel(`list-${listId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_list_items", filter: `list_id=eq.${listId}` }, () => {
        void refetch();
      })
      .subscribe();
    const poll = setInterval(() => void refetch(), 4000);
    return () => {
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [supabase, listId, refetch]);

  const toggle = useCallback(
    async (id: string, checked: boolean) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked } : i)));
      const { error } = await supabase.from("shopping_list_items").update({ checked }).eq("id", id);
      if (error) void refetch();
    },
    [supabase, refetch],
  );

  const groups = new Map<string, ShoppingItem[]>();
  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    const list = groups.get(item.aisle) ?? [];
    list.push(item);
    groups.set(item.aisle, list);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => aisleRank(a[0]) - aisleRank(b[0]) || a[0].localeCompare(b[0]));

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-4">
      <form action={addManualItem} className="flex gap-2">
        <input type="hidden" name="listId" value={listId} />
        <input
          name="name"
          required
          maxLength={200}
          placeholder="Add an item"
          aria-label="Add an item"
          className="h-12 flex-1 rounded-xl border border-stone-300 bg-white px-4 text-base"
        />
        <button type="submit" className="h-12 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white">
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-stone-600 shadow-sm ring-1 ring-stone-200">
          Nothing here yet. Add an item above, or open a recipe and tap &ldquo;Add to shopping list&rdquo;.
        </p>
      ) : (
        <>
          {sortedGroups.map(([aisle, lines]) => (
            <section key={aisle} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{aisle}</h2>
              <ul className="mt-1 divide-y divide-stone-100">
                {lines.map((item) => {
                  const amount = formatScaled(item.qtyMin, item.qtyMax, item.unitId, item.unitLabel, 1);
                  return (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-start gap-3 py-2.5" data-testid="list-item">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => void toggle(item.id, e.target.checked)}
                          aria-label={item.name}
                          className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-300 text-orange-600 focus:ring-orange-200"
                        />
                        <span className="min-w-0 flex-1">
                          <span className={`block ${item.checked ? "text-stone-400 line-through" : "text-stone-900"}`}>
                            {amount && <span className="font-semibold">{amount} </span>}
                            {item.name}
                          </span>
                          {item.recipes.length > 0 && (
                            <span className="block text-xs text-stone-400">{item.recipes.join(", ")}</span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {checkedCount > 0 && (
            <form action={clearChecked}>
              <input type="hidden" name="listId" value={listId} />
              <SubmitButton variant="secondary" pendingText="Clearing…">
                Clear {checkedCount} ticked
              </SubmitButton>
            </form>
          )}
        </>
      )}
    </div>
  );
}
