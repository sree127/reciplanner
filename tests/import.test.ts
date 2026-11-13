import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { condenseSteps, parseIngredientLine, parseIsoDuration, parseRecipeHtml } from "../src/lib/import.ts";

describe("ingredient line parsing", () => {
  it("splits quantity, unit, name and note", () => {
    assert.deepEqual(parseIngredientLine("2 cups all-purpose flour, sifted"), {
      raw: "2 cups all-purpose flour, sifted",
      qtyText: "2",
      unitToken: "cup",
      name: "all-purpose flour",
      note: "sifted",
    });
  });

  it("maps count words to a piece and drops them from the name", () => {
    const parsed = parseIngredientLine("3 cloves garlic, minced");
    assert.equal(parsed.qtyText, "3");
    assert.equal(parsed.unitToken, "piece");
    assert.equal(parsed.name, "garlic");
    assert.equal(parsed.note, "minced");
  });

  it("treats a bare count as pieces and strips size words", () => {
    const parsed = parseIngredientLine("2 large eggs");
    assert.equal(parsed.qtyText, "2");
    assert.equal(parsed.unitToken, "piece");
    assert.equal(parsed.name, "eggs");
  });

  it("keeps mixed and unicode fractions the kitchen parser understands", () => {
    assert.equal(parseIngredientLine("1 1/2 tbsp olive oil").qtyText, "1 1/2");
    assert.equal(parseIngredientLine("½ tsp salt").qtyText, "1/2");
  });

  it("handles an ingredient with no quantity", () => {
    const parsed = parseIngredientLine("Salt and pepper to taste");
    assert.equal(parsed.qtyText, "");
    assert.equal(parsed.unitToken, "");
    assert.equal(parsed.name, "Salt and pepper to taste");
  });

  it("ignores a leading parenthetical", () => {
    const parsed = parseIngredientLine("1 (400 g) can chopped tomatoes");
    assert.equal(parsed.qtyText, "1");
    assert.equal(parsed.unitToken, "piece");
    assert.equal(parsed.name, "chopped tomatoes");
  });
});

describe("ISO durations", () => {
  it("reads hours and minutes", () => {
    assert.equal(parseIsoDuration("PT1H30M"), 90);
    assert.equal(parseIsoDuration("PT20M"), 20);
    assert.equal(parseIsoDuration("PT2H"), 120);
    assert.equal(parseIsoDuration("garbage"), null);
  });
});

describe("step condensing", () => {
  it("keeps six or fewer steps as-is", () => {
    assert.deepEqual(condenseSteps(["a", "b", "c"]), ["a", "b", "c"]);
  });

  it("merges overflow into the last of six, losing no text", () => {
    const result = condenseSteps(["1", "2", "3", "4", "5", "6", "7", "8"]);
    assert.equal(result.length, 6);
    assert.equal(result[5], "6 7 8");
  });
});

describe("JSON-LD recipe extraction", () => {
  const html = `<!doctype html><html><head>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "ignore me" },
        {
          "@type": "Recipe",
          name: "Weeknight Lentil Soup",
          description: "Cozy and quick.",
          recipeYield: "4 servings",
          prepTime: "PT10M",
          cookTime: "PT20M",
          image: ["https://example.com/soup.jpg"],
          author: { "@type": "Person", name: "Nonna" },
          recipeIngredient: ["2 onions, diced", "400 g red lentils", "1 tsp salt"],
          recipeInstructions: [
            { "@type": "HowToStep", text: "Soften the onions." },
            { "@type": "HowToStep", text: "Add lentils and water." },
            { "@type": "HowToStep", text: "Simmer 20 minutes." },
          ],
        },
      ],
    })}</script></head><body></body></html>`;

  it("pulls the Recipe node out of an @graph", () => {
    const parsed = parseRecipeHtml(html, "https://example.com/soup");
    assert.ok(parsed);
    assert.equal(parsed.title, "Weeknight Lentil Soup");
    assert.equal(parsed.servings, 4);
    assert.equal(parsed.prepMin, 10);
    assert.equal(parsed.cookMin, 20);
    assert.equal(parsed.photoUrl, "https://example.com/soup.jpg");
    assert.equal(parsed.sourceAuthor, "Nonna");
    assert.equal(parsed.ingredients.length, 3);
    assert.equal(parsed.ingredients[1].name, "red lentils");
    assert.equal(parsed.ingredients[1].unitToken, "g");
    assert.deepEqual(parsed.steps, ["Soften the onions.", "Add lentils and water.", "Simmer 20 minutes."]);
  });

  it("returns null when a page has no recipe data", () => {
    assert.equal(parseRecipeHtml("<html><body>No recipe here</body></html>", "https://x.test"), null);
  });
});
