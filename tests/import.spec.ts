import { expect, test } from "@playwright/test";
import { signInWithCode, uniqueEmail } from "./helpers";

test("import a recipe from a link in one step and save it", async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  await signInWithCode(owner, uniqueEmail("importer"));
  await owner.getByLabel("Household name").fill("Import kitchen");
  await owner.getByRole("button", { name: "Create household" }).click();
  await owner.waitForURL("**/household?created=1");

  await owner.goto("/import");
  await owner.getByLabel("Recipe link").fill("http://127.0.0.1:8787/soup.html");
  await owner.getByRole("button", { name: "Import and save" }).click();

  // One click: lands straight on the saved recipe, read from the page's schema.org data.
  await owner.waitForURL(/\/recipes\/[0-9a-f-]+/);
  await expect(owner.getByTestId("recipe-title")).toHaveText("Weeknight Lentil Soup");
  await expect(owner.getByTestId("imported-note")).toBeVisible();

  // Every ingredient was kept — matched ones and the unmatched "secret chilli paste",
  // which was added to the household catalog rather than dropped.
  const ingredients = owner.getByTestId("ingredient-line");
  await expect(ingredients.filter({ hasText: "Onion" })).toHaveCount(1);
  await expect(ingredients.filter({ hasText: /chilli paste/i })).toHaveCount(1);

  // The method was condensed to at most six steps, keeping the final merged step.
  await expect(owner.getByText("Blend half the soup", { exact: false })).toBeVisible();
  expect(await owner.locator("ol li").count()).toBeLessThanOrEqual(6);

  // The saved recipe links back to the source page and its author.
  const source = owner.getByTestId("recipe-source");
  await expect(source).toContainText("127.0.0.1");
  await expect(source).toContainText("Nonna Rosa");

  // Nutrition published by the page is kept (per serving), not just estimated from ingredients.
  const nutrition = owner.getByTestId("macros");
  await expect(nutrition).toContainText("210");
  await expect(nutrition).toContainText("From the recipe source");
});
