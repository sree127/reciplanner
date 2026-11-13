"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { addRecipeToList } from "@/app/(app)/lists/actions";

const LAST_LIST_KEY = "reciplanner-last-list";

type ListOption = { id: string; name: string; isDefault: boolean };

export function AddToList({
  recipeId,
  servings,
  lists,
}: {
  recipeId: string;
  servings: number;
  lists: ListOption[];
}) {
  const defaultId = lists.find((l) => l.isDefault)?.id ?? lists[0]?.id ?? "";
  const [listId, setListId] = useState(defaultId);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Remember the last list used on this device (client-only; preselects the picker).
  useEffect(() => {
    const saved = localStorage.getItem(LAST_LIST_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && lists.some((l) => l.id === saved)) setListId(saved);
  }, [lists]);

  if (lists.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-lg font-semibold text-stone-900">Shopping list</h2>
        <p className="mt-1 text-sm text-stone-600">
          <Link href="/lists" className="font-semibold text-orange-700 underline">Create a shopping list</Link> to add these ingredients.
        </p>
      </section>
    );
  }

  const add = () => {
    setMessage(null);
    localStorage.setItem(LAST_LIST_KEY, listId);
    startTransition(async () => {
      const result = await addRecipeToList(listId, recipeId, servings);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      const name = lists.find((l) => l.id === listId)?.name ?? "the list";
      setMessage(`Added ${result.count} ${result.count === 1 ? "ingredient" : "ingredients"} to ${name}.`);
    });
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200" data-testid="add-to-list">
      <h2 className="text-lg font-semibold text-stone-900">Shopping list</h2>
      <p className="mt-0.5 text-sm text-stone-500">Adds the ingredients for {servings} {servings === 1 ? "serving" : "servings"}.</p>
      <div className="mt-3 flex gap-2">
        {lists.length > 1 && (
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            aria-label="Choose a list"
            className="h-12 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-base"
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={add}
          disabled={pending || !listId}
          className={`h-12 rounded-xl bg-orange-600 px-5 text-base font-semibold text-white disabled:opacity-60 ${lists.length > 1 ? "" : "w-full"}`}
        >
          {pending ? "Adding…" : "Add to shopping list"}
        </button>
      </div>
      {message && (
        <p className="mt-2 text-sm text-stone-700" data-testid="add-to-list-message" role="status">
          {message}{" "}
          <Link href={`/lists/${listId}`} className="font-semibold text-orange-700 underline">View list</Link>
        </p>
      )}
    </section>
  );
}
