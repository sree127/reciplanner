// Deterministic per-serving macro maths, shared by the recipe view's estimate and the
// "Estimate nutrition" action. Ingredient macros are stored per 100 g (USDA SR Legacy style),
// so a line contributes (grams / 100) × per-100g. Kept pure so it is unit-testable.

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

export type Per100g = {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export type EstimateLine = {
  name: string;
  grams: number | null;
  optional: boolean;
  per100g: Per100g | null;
};

export type MacroTotals = {
  /** Total macros across every countable line (not divided by servings). */
  total: Macros;
  /** Lines with both a weight and per-100g data that were counted. */
  counted: number;
  /** Non-optional lines in the recipe. */
  totalLines: number;
  /** Names of non-optional lines that could not be counted (no weight or no macros). */
  missing: string[];
};

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Sum macros from non-optional lines that have both a gram weight and per-100g data. */
export function sumIngredientMacros(lines: EstimateLine[]): MacroTotals {
  const total: Macros = { ...ZERO_MACROS };
  const missing: string[] = [];
  let counted = 0;
  let totalLines = 0;
  for (const line of lines) {
    if (line.optional) continue;
    totalLines += 1;
    const grams = line.grams;
    const macro = line.per100g;
    if (grams == null || grams <= 0 || !macro || macro.kcal == null) {
      if (!missing.includes(line.name)) missing.push(line.name);
      continue;
    }
    const factor = grams / 100;
    total.kcal += (macro.kcal ?? 0) * factor;
    total.protein += (macro.protein_g ?? 0) * factor;
    total.carbs += (macro.carbs_g ?? 0) * factor;
    total.fat += (macro.fat_g ?? 0) * factor;
    counted += 1;
  }
  return { total, counted, totalLines, missing };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

/** Divide recipe totals by servings (servings <= 0 is treated as 1). */
export function perServingMacros(total: Macros, servings: number): Macros {
  const s = servings > 0 ? servings : 1;
  return { kcal: total.kcal / s, protein: total.protein / s, carbs: total.carbs / s, fat: total.fat / s };
}

/** Calories to the nearest whole number, grams to one decimal. */
export function roundMacros(m: Macros): Macros {
  const one = (n: number) => Math.round(n * 10) / 10;
  return { kcal: Math.round(m.kcal), protein: one(m.protein), carbs: one(m.carbs), fat: one(m.fat) };
}
