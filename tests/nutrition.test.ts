import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addMacros,
  perServingMacros,
  roundMacros,
  sumIngredientMacros,
  type EstimateLine,
} from "../src/lib/nutrition.ts";

// Firm tofu, per 100 g (USDA SR Legacy, as seeded): 144 kcal, 17.27 g protein, 2.78 carbs, 8.72 fat.
const TOFU_FIRM = { kcal: 144, protein_g: 17.27, carbs_g: 2.78, fat_g: 8.72 };
const TOMATO = { kcal: 18, protein_g: 0.88, carbs_g: 3.89, fat_g: 0.2 };

describe("ingredient macro totals", () => {
  it("scales per-100g macros by grams, not by count (400 g firm tofu ≈ 69 g protein total)", () => {
    const lines: EstimateLine[] = [{ name: "Tofu, firm", grams: 400, optional: false, per100g: TOFU_FIRM }];
    const { total, counted, missing } = sumIngredientMacros(lines);
    assert.equal(counted, 1);
    assert.deepEqual(missing, []);
    // 400 g at 17.27 g/100 g = 69.08 g protein for the whole recipe.
    assert.ok(Math.abs(total.protein - 69.08) < 0.01, `protein total ${total.protein}`);
    assert.ok(Math.abs(total.kcal - 576) < 0.5, `kcal total ${total.kcal}`);
  });

  it("per serving for 400 g firm tofu over 4 servings is ~17 g protein, never ~11", () => {
    const lines: EstimateLine[] = [{ name: "Tofu, firm", grams: 400, optional: false, per100g: TOFU_FIRM }];
    const { total } = sumIngredientMacros(lines);
    const per = roundMacros(perServingMacros(total, 4));
    // The bug under repair reported ~11 g protein per serving; the correct figure is ~17.3 g.
    assert.ok(per.protein > 15 && per.protein < 20, `protein per serving ${per.protein}`);
    assert.equal(per.protein, 17.3);
    assert.equal(per.kcal, 144);
    assert.equal(per.fat, 8.7);
  });

  it("skips lines with no weight (a 'piece' line with no grams) and reports them missing", () => {
    const lines: EstimateLine[] = [
      { name: "Tofu, firm", grams: 400, optional: false, per100g: TOFU_FIRM },
      { name: "Tomato", grams: null, optional: false, per100g: TOMATO },
    ];
    const { total, counted, missing } = sumIngredientMacros(lines);
    assert.equal(counted, 1);
    assert.deepEqual(missing, ["Tomato"]);
    // The tofu is still fully counted even though the tomato has no weight.
    assert.ok(Math.abs(total.protein - 69.08) < 0.01);
  });

  it("adds a gap-fill contribution (e.g. 2 tomatoes ≈ 246 g) on top of the database total", () => {
    const tofuOnly = sumIngredientMacros([
      { name: "Tofu, firm", grams: 400, optional: false, per100g: TOFU_FIRM },
    ]).total;
    const tomatoes = { kcal: 44, protein: 2.2, carbs: 9.6, fat: 0.5 };
    const per = roundMacros(perServingMacros(addMacros(tofuOnly, tomatoes), 4));
    assert.ok(per.protein > 15, `protein per serving ${per.protein}`);
    assert.ok(per.kcal > 140, `kcal per serving ${per.kcal}`);
  });

  it("ignores optional lines", () => {
    const { counted, totalLines } = sumIngredientMacros([
      { name: "Tofu, firm", grams: 400, optional: false, per100g: TOFU_FIRM },
      { name: "Garnish", grams: 50, optional: true, per100g: TOMATO },
    ]);
    assert.equal(counted, 1);
    assert.equal(totalLines, 1);
  });
});
