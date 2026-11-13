"use client";

import { useState, useTransition } from "react";

import { estimateNutrition, saveNutrition } from "@/app/(app)/recipes/actions";
import type { RecipeNutrition } from "@/lib/recipes";

const FIELDS = [
  { key: "kcal", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Draft = Record<FieldKey, string>;

function toDraft(n: RecipeNutrition["perServing"]): Draft {
  const str = (v: number | null) => (v == null ? "" : String(v));
  return { kcal: str(n.kcal), protein: str(n.protein), carbs: str(n.carbs), fat: str(n.fat) };
}

function parseField(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function NutritionEditor({ recipeId, nutrition }: { recipeId: string; nutrition: RecipeNutrition }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(nutrition.perServing));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [estimating, startEstimating] = useTransition();

  const per = nutrition.perServing;
  const { source, countedIngredients, totalIngredients, missing } = nutrition;
  const hasValues = per.kcal != null || per.protein != null || per.carbs != null || per.fat != null;

  const open = () => {
    setDraft(toDraft(nutrition.perServing));
    setError(null);
    setMessage(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const estimate = () => {
    setError(null);
    setMessage(null);
    startEstimating(async () => {
      const result = await estimateNutrition(recipeId);
      if ("error" in result) {
        if (!editing) setEditing(true);
        setError(result.error);
        return;
      }
      const v = result.values;
      setDraft({
        kcal: v.kcal == null ? "" : String(v.kcal),
        protein: v.protein == null ? "" : String(v.protein),
        carbs: v.carbs == null ? "" : String(v.carbs),
        fat: v.fat == null ? "" : String(v.fat),
      });
      setEditing(true);
      setMessage("Estimated from the ingredients — review and save.");
    });
  };

  const save = () => {
    setError(null);
    setMessage(null);
    startSaving(async () => {
      const result = await saveNutrition(recipeId, {
        kcal: parseField(draft.kcal),
        protein: parseField(draft.protein),
        carbs: parseField(draft.carbs),
        fat: parseField(draft.fat),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
      setMessage("Saved.");
    });
  };

  const sourceNote =
    source === "web"
      ? "From the recipe source. Edit to override."
      : source === "manual"
        ? "Your saved values."
        : source === "estimate"
          ? `Estimated from ${countedIngredients} of ${totalIngredients} ingredients.${
              missing.length > 0 ? ` No data yet for ${missing.join(", ")}.` : ""
            }`
          : null;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200" data-testid="macros">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-stone-900">Nutrition</h2>
        <span className="text-sm text-stone-500">per serving</span>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FIELDS.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500">{field.label}</span>
                <div className="flex items-center rounded-xl border border-stone-300 px-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft[field.key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                    aria-label={`${field.label} per serving in ${field.unit}`}
                    data-testid={`nutrition-${field.key}`}
                    className="h-11 w-full bg-transparent text-base outline-none"
                    placeholder="—"
                  />
                  <span className="ml-1 text-sm text-stone-500">{field.unit}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              data-testid="nutrition-save"
              className="h-11 flex-1 rounded-xl bg-orange-600 px-4 text-base font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={estimate}
              disabled={estimating}
              data-testid="nutrition-estimate"
              className="h-11 rounded-xl bg-white px-4 text-base font-semibold text-stone-800 ring-1 ring-stone-300 disabled:opacity-60"
            >
              {estimating ? "Estimating…" : "Estimate nutrition"}
            </button>
            <button type="button" onClick={cancel} className="h-11 rounded-xl px-4 text-base font-medium text-stone-600">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {hasValues ? (
            <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
              {FIELDS.map((field) => (
                <div key={field.key} className="rounded-xl bg-stone-50 py-2">
                  <dt className="text-xs uppercase tracking-wide text-stone-500">{field.label}</dt>
                  <dd className="text-lg font-semibold text-stone-900">
                    {per[field.key] == null ? "—" : Math.round((per[field.key] as number) * 10) / 10}
                    <span className="ml-0.5 text-xs font-normal text-stone-500">{field.unit}</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-stone-500">No nutrition yet. Estimate it from the ingredients or enter it yourself.</p>
          )}
          {sourceNote && <p className="mt-2 text-sm text-stone-500">{sourceNote}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={open}
              data-testid="nutrition-edit"
              className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-stone-800 ring-1 ring-stone-300"
            >
              {hasValues ? "Edit" : "Enter nutrition"}
            </button>
            <button
              type="button"
              onClick={estimate}
              disabled={estimating}
              data-testid="nutrition-estimate"
              className="h-10 rounded-xl bg-white px-4 text-sm font-semibold text-stone-800 ring-1 ring-stone-300 disabled:opacity-60"
            >
              {estimating ? "Estimating…" : "Estimate nutrition"}
            </button>
          </div>
        </>
      )}

      {message && !error && (
        <p className="mt-2 text-sm font-medium text-emerald-700" data-testid="nutrition-message">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert" data-testid="nutrition-error">
          {error}
        </p>
      )}
    </section>
  );
}
