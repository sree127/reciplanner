"use client";

import Link from "next/link";
import { useState } from "react";
import { formatScaled } from "@/lib/kitchen";
import type { RecipeDetail } from "@/lib/recipes";
import { IngredientAddButton } from "@/components/ingredient-add-button";
import { NutritionEditor } from "@/components/nutrition-editor";

export function RecipeView({
  recipe,
  lists,
}: {
  recipe: RecipeDetail;
  lists: { id: string; name: string; isDefault: boolean }[];
}) {
  const [servings, setServings] = useState(recipe.servings);
  const hasLists = lists.length > 0;
  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
  const scaledYield = recipe.yieldQty == null ? null : formatScaled(recipe.yieldQty, null, null, recipe.yieldLabel, factor);

  const sectionTitle = new Map(recipe.sections.map((s) => [s.key, s.title]));
  const groups: { title: string | null; lines: RecipeDetail["ingredients"] }[] = [];
  for (const line of recipe.ingredients) {
    const title = line.sectionId ? (sectionTitle.get(line.sectionId) ?? null) : null;
    const last = groups[groups.length - 1];
    if (!last || last.title !== title) groups.push({ title, lines: [line] });
    else last.lines.push(line);
  }
  return (
    <div className="space-y-4">
      <label className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Servings</span>
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={servings}
          onChange={(e) => setServings(Math.max(0.5, Number(e.target.value) || recipe.servings))}
          data-testid="servings"
          className="h-12 w-full rounded-xl border border-stone-300 px-4 text-base"
        />
        {factor !== 1 && (
          <span className="mt-1 block text-sm text-stone-500">Scaled from {recipe.servings}. Amounts are rounded for the kitchen.</span>
        )}
        {scaledYield && <span className="mt-1 block text-sm text-stone-700">Makes {scaledYield}</span>}
      </label>

      <NutritionEditor recipeId={recipe.id} nutrition={recipe.nutrition} />

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-lg font-semibold text-stone-900">Ingredients</h2>
        {hasLists ? (
          <p className="mt-0.5 text-sm text-stone-500">Tap + to add an ingredient to a shopping list.</p>
        ) : (
          <p className="mt-0.5 text-sm text-stone-500">
            Create a{" "}
            <Link href="/lists" className="font-semibold text-orange-700 underline">shopping list</Link>{" "}
            to add ingredients.
          </p>
        )}
        {groups.map((group) => (
          <div key={group.title ?? "main"} className="mt-3">
            {group.title && <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{group.title}</h3>}
            <ul className="mt-1 divide-y divide-stone-100">
              {group.lines.map((line) => (
                <li key={line.key} className="flex items-start justify-between gap-3 py-2.5" data-testid="ingredient-line">
                  <div className="min-w-0">
                    <p className="text-stone-900">
                      <span className="font-semibold">
                        {formatScaled(line.qtyMin, line.qtyMax, line.unitId, line.unitLabel, factor)}
                      </span>{" "}
                      {line.name}
                      {line.optional && <span className="text-stone-500"> (optional)</span>}
                    </p>
                    {line.note && <p className="text-sm text-stone-500">{line.note}</p>}
                  </div>
                  {hasLists && (
                    <IngredientAddButton
                      recipeIngredientId={line.key}
                      ingredientName={line.name}
                      servings={servings}
                      lists={lists}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {recipe.steps.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-semibold text-stone-900">Steps</h2>
          <ol className="mt-2 space-y-3">
            {recipe.steps.map((step, index) => (
              <li key={step.key} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-800">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-stone-800">
                  {step.text}
                  {step.timerSec ? <span className="mt-1 block text-sm text-stone-500">{Math.round(step.timerSec / 60)} min timer</span> : null}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
