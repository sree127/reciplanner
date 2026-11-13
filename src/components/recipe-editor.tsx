"use client";

import { useEffect, useRef, useState } from "react";
import type { Json } from "@/lib/supabase/database.types";
import { UNITS, convertQuantity } from "@/lib/kitchen";
import { createCategory, createIngredient, saveRecipe, searchIngredients, type IngredientHit } from "@/app/(app)/recipes/actions";

type Category = { id: string; name: string };
type Line =
  | { key: string; type: "section"; title: string }
  | {
      key: string;
      type: "ingredient";
      qty: string;
      unitToken: string;
      ingredientId: string | null;
      ingredientName: string;
      density: number | null;
      portions: IngredientHit["portions"];
      note: string;
      optional: boolean;
      toTaste: boolean;
    }
  | { key: string; type: "step"; text: string; timerMin: string };

export type EditorInitial = {
  id?: string;
  title: string;
  description: string;
  servings: string;
  yieldQty: string;
  yieldLabel: string;
  prepMin: string;
  cookMin: string;
  notes: string;
  photoUrl: string;
  categoryIds: string[];
  tags: string[];
  lines: Line[];
};

const inputClass = "h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900";

function blankIngredient(): Line {
  return {
    key: crypto.randomUUID(),
    type: "ingredient",
    qty: "",
    unitToken: "g",
    ingredientId: null,
    ingredientName: "",
    density: null,
    portions: [],
    note: "",
    optional: false,
    toTaste: false,
  };
}

export function RecipeEditor({
  initial,
  categories,
  draftKey,
}: {
  initial: EditorInitial;
  categories: Category[];
  draftKey?: string;
}) {
  const [state, setState] = useState(initial);
  const [cats, setCats] = useState(categories);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [restored, setRestored] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hits, setHits] = useState<IngredientHit[]>([]);
  const [searchedAll, setSearchedAll] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);
  const [macros, setMacros] = useState({ kcal: "", protein: "", carbs: "", fat: "" });
  const [newCategory, setNewCategory] = useState("");
  const [tag, setTag] = useState("");

  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (!saved) return;
    try {
      // Restoring a draft has to happen after mount: the server render has no localStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(JSON.parse(saved) as EditorInitial);
      setRestored(true);
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    const timer = setTimeout(() => localStorage.setItem(draftKey, JSON.stringify(state)), 400);
    return () => clearTimeout(timer);
  }, [draftKey, state]);

  function updateLine(key: string, patch: Partial<Line>) {
    setState((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.key === key ? ({ ...line, ...patch } as Line) : line)),
    }));
  }

  function move(key: string, direction: -1 | 1) {
    setState((prev) => {
      const index = prev.lines.findIndex((line) => line.key === key);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= prev.lines.length) return prev;
      const lines = [...prev.lines];
      [lines[index], lines[next]] = [lines[next], lines[index]];
      return { ...prev, lines };
    });
  }

  async function runSearch(value: string, all: boolean) {
    const term = value.trim();
    const seq = ++searchSeq.current;
    if (term.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const results = await searchIngredients(term, all);
    // Only the latest search may update the list, so a slow earlier request can't overwrite it.
    if (seq !== searchSeq.current) return;
    setHits(results);
    setSearchedAll(all);
    setSearching(false);
  }

  async function onIngredientInput(key: string, value: string) {
    updateLine(key, { ingredientName: value, ingredientId: null, density: null, portions: [] });
    setActive(key);
    setSearchedAll(false);
    await runSearch(value, false);
  }

  function pick(key: string, hit: IngredientHit) {
    searchSeq.current += 1;
    updateLine(key, {
      ingredientId: hit.id,
      ingredientName: hit.name,
      density: hit.density,
      portions: hit.portions,
    });
    setHits([]);
    setSearchedAll(false);
    setActive(null);
  }

  async function addCustom(key: string, name: string) {
    const numberOrUndefined = (value: string) => (value.trim() === "" ? undefined : Number(value));
    const result = await createIngredient(name, {
      kcal: numberOrUndefined(macros.kcal),
      protein: numberOrUndefined(macros.protein),
      carbs: numberOrUndefined(macros.carbs),
      fat: numberOrUndefined(macros.fat),
    });
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if (!("id" in result) || !result.id) return;
    updateLine(key, { ingredientId: result.id, ingredientName: name.trim(), density: null, portions: [] });
    setHits([]);
    setActive(null);
    setMacros({ kcal: "", protein: "", carbs: "", fat: "" });
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    const result = await createCategory(name);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if (!("id" in result) || !result.id) return;
    setCats((prev) => [...prev, { id: result.id!, name: result.name! }]);
    setState((prev) => ({ ...prev, categoryIds: [...prev.categoryIds, result.id!] }));
    setNewCategory("");
  }

  async function onSubmit() {
    setError(null);
    const servings = Number(state.servings);
    if (!state.title.trim()) return setError("Give the recipe a title.");
    if (!Number.isFinite(servings) || servings <= 0) return setError("Servings must be greater than 0.");

    const lines: Json[] = [];
    for (const line of state.lines) {
      if (line.type === "section") {
        if (line.title.trim()) lines.push({ type: "section", title: line.title.trim() });
        continue;
      }
      if (line.type === "step") {
        if (line.text.trim()) {
          const minutes = Number(line.timerMin);
          lines.push({
            type: "step",
            text: line.text.trim(),
            timer_sec: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : null,
          });
        }
        continue;
      }
      if (!line.ingredientName.trim() && !line.qty.trim()) continue;
      if (!line.ingredientId) return setError(`Pick "${line.ingredientName || "an ingredient"}" from the list, or add it.`);
      const converted = convertQuantity({
        qtyText: line.qty,
        unitToken: line.unitToken,
        density: line.density,
        toTaste: line.toTaste,
      });
      if ("error" in converted) return setError(`${line.ingredientName}: ${converted.error}`);
      lines.push({
        type: "ingredient",
        ingredient_id: line.ingredientId,
        qty_min: converted.qtyMin,
        qty_max: converted.qtyMax,
        unit_id: converted.unitId,
        unit_label: converted.unitLabel,
        grams: converted.grams,
        note: line.note,
        optional: line.optional,
        raw_text: [line.qty, line.unitToken, line.ingredientName, line.note].filter(Boolean).join(" "),
      });
    }

    setPending(true);
    if (draftKey) localStorage.removeItem(draftKey);
    const result = await saveRecipe({
      id: state.id,
      title: state.title,
      description: state.description,
      servings,
      yield_qty: state.yieldQty.trim() === "" ? null : Number(state.yieldQty),
      yield_unit_label: state.yieldLabel,
      prep_min: state.prepMin.trim() === "" ? null : Number(state.prepMin),
      cook_min: state.cookMin.trim() === "" ? null : Number(state.cookMin),
      notes: state.notes,
      photo_url: state.photoUrl,
      category_ids: state.categoryIds,
      tags: state.tags,
      lines,
    });
    if (draftKey) localStorage.setItem(draftKey, JSON.stringify(state));
    setPending(false);
    setError(result.error);
  }

  const activeLine = state.lines.find((line) => line.key === active && line.type === "ingredient");
  const showAdd =
    activeLine?.type === "ingredient" &&
    activeLine.ingredientName.trim().length >= 2 &&
    !hits.some((hit) => hit.name.toLowerCase() === activeLine.ingredientName.trim().toLowerCase());

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
    >
      {restored && (
        <p className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Draft restored.
          <button
            type="button"
            className="font-semibold"
            onClick={() => {
              if (draftKey) localStorage.removeItem(draftKey);
              setState(initial);
              setRestored(false);
            }}
          >
            Discard
          </button>
        </p>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Title</span>
        <input className={inputClass} value={state.title} onChange={(e) => setState({ ...state, title: e.target.value })} required />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Description</span>
        <textarea className={`${inputClass} h-20 py-2`} value={state.description} onChange={(e) => setState({ ...state, description: e.target.value })} />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Servings</span>
          <input className={inputClass} inputMode="decimal" value={state.servings} onChange={(e) => setState({ ...state, servings: e.target.value })} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Prep min</span>
          <input className={inputClass} inputMode="numeric" value={state.prepMin} onChange={(e) => setState({ ...state, prepMin: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Cook min</span>
          <input className={inputClass} inputMode="numeric" value={state.cookMin} onChange={(e) => setState({ ...state, cookMin: e.target.value })} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">Makes (optional)</span>
          <input className={inputClass} inputMode="decimal" placeholder="24" value={state.yieldQty} onChange={(e) => setState({ ...state, yieldQty: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-stone-700">of</span>
          <input className={inputClass} placeholder="cookies" value={state.yieldLabel} onChange={(e) => setState({ ...state, yieldLabel: e.target.value })} />
        </label>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-stone-700">Categories</legend>
        <div className="flex flex-wrap gap-2">
          {cats.map((cat) => {
            const on = state.categoryIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    categoryIds: on ? prev.categoryIds.filter((id) => id !== cat.id) : [...prev.categoryIds, cat.id],
                  }))
                }
                className={`h-10 rounded-full px-3 text-sm font-semibold ${on ? "bg-orange-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-300"}`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
          <button type="button" onClick={() => void addCategory()} className="h-12 shrink-0 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-stone-300">
            Add
          </button>
        </div>
      </fieldset>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Tags</span>
        <div className="mb-2 flex flex-wrap gap-2">
          {state.tags.map((item) => (
            <button key={item} type="button" className="h-9 rounded-full bg-stone-200 px-3 text-sm" onClick={() => setState((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== item) }))}>
              {item} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="vegetarian"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const next = tag.trim();
                if (next && !state.tags.includes(next)) setState((prev) => ({ ...prev, tags: [...prev.tags, next] }));
                setTag("");
              }
            }}
          />
          <button
            type="button"
            className="h-12 shrink-0 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-stone-300"
            onClick={() => {
              const next = tag.trim();
              if (next && !state.tags.includes(next)) setState((prev) => ({ ...prev, tags: [...prev.tags, next] }));
              setTag("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">Ingredients and steps</h2>
        {state.lines.map((line) => (
          <div key={line.key} className="space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200">
            {line.type === "section" && (
              <input className={inputClass} aria-label="Section" placeholder="Section, like Sauce" value={line.title} onChange={(e) => updateLine(line.key, { title: e.target.value })} />
            )}
            {line.type === "ingredient" && (
              <>
                <div className="grid grid-cols-[7rem_1fr] gap-2">
                  <input className={inputClass} aria-label="Quantity" placeholder="200" value={line.qty} disabled={line.toTaste} onChange={(e) => updateLine(line.key, { qty: e.target.value })} />
                  <select className={inputClass} aria-label="Unit" value={line.unitToken} onChange={(e) => updateLine(line.key, { unitToken: e.target.value })}>
                    <optgroup label="Metric">
                      {UNITS.filter((u) => u.display && u.kind !== "count").map((u) => (
                        <option key={u.id} value={u.id}>{u.abbrev}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Converts to metric">
                      {UNITS.filter((u) => !u.display).map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </optgroup>
                    {line.portions.some((p) => p.label) && (
                      <optgroup label="This ingredient">
                        {line.portions.filter((p) => p.label).map((p) => (
                          <option key={p.label} value={`portion|${p.grams}|${p.label}`}>{p.label} ({p.grams} g)</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="piece">piece</option>
                  </select>
                </div>
                <div className="relative">
                  <input
                    className={inputClass}
                    aria-label="Ingredient"
                    autoComplete="off"
                    placeholder="Search the catalog"
                    value={line.ingredientName}
                    onChange={(e) => void onIngredientInput(line.key, e.target.value)}
                    onFocus={() => setActive(line.key)}
                  />
                  {active === line.key && (hits.length > 0 || showAdd || searching) && (
                    <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-stone-200" role="listbox">
                      {hits.map((hit) => (
                        <li key={hit.id}>
                          <button type="button" role="option" aria-selected={false} className="block w-full px-3 py-2 text-left" onClick={() => pick(line.key, hit)}>
                            <span className="block text-sm font-medium text-stone-900">{hit.name}</span>
                            {hit.aisle && <span className="block text-xs text-stone-500">{hit.aisle}</span>}
                          </button>
                        </li>
                      ))}
                      {searching && <li className="px-3 py-2 text-sm text-stone-500">Searching…</li>}
                      {!searching && !searchedAll && activeLine?.type === "ingredient" && activeLine.ingredientName.trim().length >= 2 && (
                        <li className="border-t border-stone-100">
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left text-sm font-semibold text-orange-700"
                            onClick={() => void runSearch(activeLine.ingredientName, true)}
                          >
                            {hits.length ? "Search all foods" : "No everyday match — search all foods"}
                          </button>
                        </li>
                      )}
                      {showAdd && activeLine?.type === "ingredient" && (
                        <li className="space-y-2 border-t border-stone-100 px-3 py-2">
                          <p className="text-sm text-stone-700">No exact match. Add “{activeLine.ingredientName.trim()}” for your household.</p>
                          <div className="grid grid-cols-4 gap-1">
                            {(["kcal", "protein", "carbs", "fat"] as const).map((field) => (
                              <input key={field} className="h-10 rounded-lg border border-stone-300 px-2 text-sm" placeholder={field} inputMode="decimal" value={macros[field]} onChange={(e) => setMacros({ ...macros, [field]: e.target.value })} />
                            ))}
                          </div>
                          <button type="button" className="h-10 w-full rounded-lg bg-orange-600 text-sm font-semibold text-white" onClick={() => void addCustom(line.key, activeLine.ingredientName)}>
                            Add ingredient
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
                <input className={inputClass} aria-label="Note" placeholder="finely chopped" value={line.note} onChange={(e) => updateLine(line.key, { note: e.target.value })} />
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={line.optional} onChange={(e) => updateLine(line.key, { optional: e.target.checked })} /> Optional
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={line.toTaste} onChange={(e) => updateLine(line.key, { toTaste: e.target.checked })} /> To taste
                  </label>
                </div>
              </>
            )}
            {line.type === "step" && (
              <>
                <textarea className={`${inputClass} h-20 py-2`} aria-label="Step" placeholder="What to do" value={line.text} onChange={(e) => updateLine(line.key, { text: e.target.value })} />
                <input className={inputClass} aria-label="Timer minutes" inputMode="numeric" placeholder="Timer minutes (optional)" value={line.timerMin} onChange={(e) => updateLine(line.key, { timerMin: e.target.value })} />
              </>
            )}
            <div className="flex gap-2 text-sm font-semibold text-stone-600">
              <button type="button" onClick={() => move(line.key, -1)}>Up</button>
              <button type="button" onClick={() => move(line.key, 1)}>Down</button>
              <button type="button" className="text-red-700" onClick={() => setState((prev) => ({ ...prev, lines: prev.lines.filter((item) => item.key !== line.key) }))}>Remove</button>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className="h-11 rounded-xl bg-white text-sm font-semibold ring-1 ring-stone-300" onClick={() => setState((prev) => ({ ...prev, lines: [...prev.lines, blankIngredient()] }))}>+ Ingredient</button>
          <button type="button" className="h-11 rounded-xl bg-white text-sm font-semibold ring-1 ring-stone-300" onClick={() => setState((prev) => ({ ...prev, lines: [...prev.lines, { key: crypto.randomUUID(), type: "step", text: "", timerMin: "" }] }))}>+ Step</button>
          <button type="button" className="h-11 rounded-xl bg-white text-sm font-semibold ring-1 ring-stone-300" onClick={() => setState((prev) => ({ ...prev, lines: [...prev.lines, { key: crypto.randomUUID(), type: "section", title: "" }] }))}>+ Section</button>
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Notes</span>
        <textarea className={`${inputClass} h-20 py-2`} value={state.notes} onChange={(e) => setState({ ...state, notes: e.target.value })} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">Photo link (optional)</span>
        <input className={inputClass} inputMode="url" placeholder="https://" value={state.photoUrl} onChange={(e) => setState({ ...state, photoUrl: e.target.value })} />
      </label>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className="h-12 w-full rounded-xl bg-orange-600 text-base font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save recipe"}
      </button>
    </form>
  );
}
