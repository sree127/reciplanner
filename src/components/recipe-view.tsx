"use client";

import { useState } from "react";
import { formatScaled } from "@/lib/kitchen";
import type { RecipeDetail } from "@/lib/recipes";

export function RecipeView({ recipe }: { recipe: RecipeDetail }) {
  const [servings, setServings] = useState(recipe.servings);
  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
  const scaledYield = recipe.yieldQty == null ? null : formatScaled(recipe.yieldQty, null, null, recipe.yieldLabel, factor);

  const per = recipe.macros.perServing;
  const { missing, countedIngredients, totalIngredients } = recipe.macros;
  const hasMacros = countedIngredients > 0;
  const macroStats = [
    { label: "Calories", value: Math.round(per.kcal), unit: "kcal" },
    { label: "Protein", value: Math.round(per.protein), unit: "g" },
    { label: "Carbs", value: Math.round(per.carbs), unit: "g" },
    { label: "Fat", value: Math.round(per.fat), unit: "g" },
  ];

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

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200" data-testid="macros">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-stone-900">Nutrition</h2>
          <span className="text-sm text-stone-500">per serving</span>
        </div>
        {hasMacros ? (
          <>
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {macroStats.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-stone-50 py-2">
                  <dt className="text-xs uppercase tracking-wide text-stone-500">{stat.label}</dt>
                  <dd className="text-lg font-semibold text-stone-900">
                    {stat.value}
                    <span className="ml-0.5 text-xs font-normal text-stone-500">{stat.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
            {missing.length > 0 && (
              <p className="mt-2 text-sm text-stone-500">
                Estimated from {countedIngredients} of {totalIngredients} ingredients. No data yet for {missing.join(", ")}.
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-stone-500">
            No nutrition data yet. Pick ingredients with a measured weight to see calories and macros.
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-lg font-semibold text-stone-900">Ingredients</h2>
        {groups.map((group) => (
          <div key={group.title ?? "main"} className="mt-3">
            {group.title && <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{group.title}</h3>}
            <ul className="mt-1 divide-y divide-stone-100">
              {group.lines.map((line) => (
                <li key={line.key} className="py-2.5" data-testid="ingredient-line">
                  <p className="text-stone-900">
                    <span className="font-semibold">
                      {formatScaled(line.qtyMin, line.qtyMax, line.unitId, line.unitLabel, factor)}
                    </span>{" "}
                    {line.name}
                    {line.optional && <span className="text-stone-500"> (optional)</span>}
                  </p>
                  {line.note && <p className="text-sm text-stone-500">{line.note}</p>}
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
