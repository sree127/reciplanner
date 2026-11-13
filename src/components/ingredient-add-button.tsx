"use client";

import { useState, useTransition } from "react";

import { addIngredientToList } from "@/app/(app)/lists/actions";

const LAST_LIST_KEY = "reciplanner-last-list";

type ListOption = { id: string; name: string; isDefault: boolean };

export function IngredientAddButton({
  recipeIngredientId,
  ingredientName,
  servings,
  lists,
}: {
  recipeIngredientId: string;
  ingredientName: string;
  servings: number;
  lists: ListOption[];
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = (listId: string) => {
    setOpen(false);
    setError(null);
    try {
      localStorage.setItem(LAST_LIST_KEY, listId);
    } catch {
      // ignore unavailable storage
    }
    startTransition(async () => {
      const result = await addIngredientToList(listId, recipeIngredientId, servings);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    });
  };

  const handleClick = () => {
    if (pending) return;
    if (lists.length === 1) {
      add(lists[0].id);
      return;
    }
    setOpen((o) => !o);
  };

  // Offer the last-used list first when there are several.
  const ordered = (() => {
    if (lists.length < 2) return lists;
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_LIST_KEY);
    } catch {
      last = null;
    }
    const idx = last ? lists.findIndex((l) => l.id === last) : -1;
    return idx > 0 ? [lists[idx], ...lists.slice(0, idx), ...lists.slice(idx + 1)] : lists;
  })();

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={`Add ${ingredientName} to a shopping list`}
        data-testid="ingredient-add"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold ring-1 transition disabled:opacity-60 ${
          done ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-white text-orange-700 ring-stone-300 hover:bg-orange-50"
        }`}
      >
        {done ? "✓" : "+"}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div role="menu" className="absolute right-0 z-20 mt-1 w-48 rounded-xl bg-white p-1 shadow-lg ring-1 ring-stone-200">
            <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-stone-400">Add to list</p>
            {ordered.map((l) => (
              <button
                key={l.id}
                type="button"
                role="menuitem"
                onClick={() => add(l.id)}
                className="block w-full truncate rounded-lg px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-50"
              >
                {l.name}
                {l.isDefault ? " · default" : ""}
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <span role="alert" className="absolute right-0 top-9 z-20 w-48 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-800 shadow">
          {error}
        </span>
      )}
    </div>
  );
}
