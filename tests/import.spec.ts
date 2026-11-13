import { expect, test } from "@playwright/test";
import { signInWithCode, uniqueEmail } from "./helpers";

test("import a recipe from a link, fix the unmatched ingredient, and save", async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  await signInWithCode(owner, uniqueEmail("importer"));
  await owner.getByLabel("Household name").fill("Import kitchen");
  await owner.getByRole("button", { name: "Create household" }).click();
  await owner.waitForURL("**/household?created=1");

  await owner.goto("/import");
  await owner.getByLabel("Recipe link").fill("http://127.0.0.1:8787/soup.html");
  await owner.getByRole("button", { name: "Import recipe" }).click();

  // Lands on the review screen, prefilled from the page's schema.org data.
  await owner.waitForURL(/\/import\/[0-9a-f-]+$/);
  await expect(owner.getByLabel("Title")).toHaveValue("Weeknight Lentil Soup");
  await expect(owner.getByTestId("import-banner")).toBeVisible();
  await expect(owner.getByTestId("unmatched-note")).toContainText("1 ingredient");

  // The method was condensed to at most six steps.
  const steps = owner.getByLabel("Step", { exact: true });
  expect(await steps.count()).toBeLessThanOrEqual(6);

  // Six of seven ingredients matched the catalog; one is flagged for the cook.
  const unmatched = owner.locator('input[aria-label="Ingredient"][data-unmatched="true"]');
  await expect(unmatched).toHaveCount(1);
  await expect(owner.getByLabel("Ingredient").first()).toHaveValue("Onion");
  await owner.screenshot({ path: "media/milestone-4-import-review.png", fullPage: true });

  // Fix the flagged ingredient by picking a catalog item.
  await unmatched.fill("Chilli powder");
  await owner.getByRole("option", { name: /^Chilli powder/ }).first().click();
  await expect(owner.locator('input[aria-label="Ingredient"][data-unmatched="true"]')).toHaveCount(0);

  await owner.getByRole("button", { name: "Save recipe" }).click();
  await expect(owner.getByTestId("recipe-title")).toHaveText("Weeknight Lentil Soup");

  // The saved recipe links back to the source and keeps the condensed method.
  const source = owner.getByTestId("recipe-source");
  await expect(source).toContainText("127.0.0.1");
  await expect(source).toContainText("Nonna Rosa");
  await expect(owner.getByText("Blend half the soup", { exact: false })).toBeVisible();
  expect(await owner.locator("ol li").count()).toBeLessThanOrEqual(6);
});
