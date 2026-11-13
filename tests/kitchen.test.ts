import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertQuantity, formatScaled, kitchenRound, parseQuantity } from "../src/lib/kitchen.ts";

describe("quantities", () => {
  it("parses fractions and ranges", () => {
    assert.deepEqual(parseQuantity("1/2"), { min: 0.5, max: null });
    assert.deepEqual(parseQuantity("1 1/2"), { min: 1.5, max: null });
    assert.deepEqual(parseQuantity("1½"), { min: 1.5, max: null });
    assert.deepEqual(parseQuantity("2-3"), { min: 2, max: 3 });
    assert.deepEqual(parseQuantity("2–3"), { min: 2, max: 3 });
  });

  it("rounds to kitchen amounts", () => {
    assert.equal(kitchenRound(187.5), 190);
    assert.equal(kitchenRound(1500), 1500);
    assert.equal(kitchenRound(1.5), 1.5);
  });

  it("converts cups and ounces, and leaves teaspoons", () => {
    const cup = convertQuantity({ qtyText: "1", unitToken: "cup", density: 0.5, toTaste: false });
    assert.ok(!("error" in cup));
    if (!("error" in cup)) {
      assert.equal(cup.unitId, "g");
      assert.equal(cup.grams, 120);
    }
    const cupNoDensity = convertQuantity({ qtyText: "1", unitToken: "cup", density: null, toTaste: false });
    assert.ok(!("error" in cupNoDensity) && cupNoDensity.unitId === "ml" && cupNoDensity.qtyMin === 240);

    const oz = convertQuantity({ qtyText: "1", unitToken: "oz", density: null, toTaste: false });
    assert.ok(!("error" in oz) && oz.unitId === "g" && Math.round(oz.grams!) === 28);

    const tsp = convertQuantity({ qtyText: "2", unitToken: "tsp", density: 1, toTaste: false });
    assert.ok(!("error" in tsp) && tsp.unitId === "tsp" && tsp.qtyMin === 2 && tsp.grams === 10);
  });

  it("keeps a clove as a clove and stores its grams", () => {
    const clove = convertQuantity({ qtyText: "2", unitToken: "portion|3|clove", density: null, toTaste: false });
    assert.ok(!("error" in clove));
    if (!("error" in clove)) {
      assert.equal(clove.unitLabel, "clove");
      assert.equal(clove.grams, 6);
      assert.equal(clove.qtyMin, 2);
    }
  });

  it("does not scale to taste, and promotes 1500 ml to 1.5 l", () => {
    assert.equal(formatScaled(null, null, null, "to taste", 2), "to taste");
    assert.equal(formatScaled(200, null, "g", null, 0.5), "100 g");
    assert.equal(formatScaled(187.5, null, "g", null, 1), "190 g");
    assert.equal(formatScaled(1500, null, "ml", null, 1), "1½ l");
    assert.equal(formatScaled(2, null, null, "clove", 0.5), "1 clove");
    assert.equal(formatScaled(1, null, null, "clove", 0.5), "½ clove");
  });
});
