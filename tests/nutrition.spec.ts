import { expect, test } from "@playwright/test";
import { signInWithCode, uniqueEmail } from "./helpers";

test("edit, save and keep a recipe's nutrition by hand", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await signInWithCode(page, uniqueEmail("nutrition"));
  await page.getByLabel("Household name").fill("Macro house");
  await page.getByRole("button", { name: "Create household" }).click();
  await page.waitForURL("**/household?created=1");

  // A simple recipe with one ingredient.
  await page.getByRole("link", { name: "Recipes" }).click();
  await page.getByRole("link", { name: "Add a recipe" }).click();
  await page.getByLabel("Title").fill("Morning oats");
  await page.getByLabel("Quantity").first().fill("100");
  await page.getByLabel("Ingredient").first().fill("Tomato");
  await page.getByRole("option", { name: /^Tomato/ }).first().click();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByTestId("recipe-title")).toHaveText("Morning oats");

  const macros = page.getByTestId("macros");

  // Estimation isn't configured in tests (no API key): a plain error, and manual editing still works.
  await macros.getByTestId("nutrition-estimate").first().click();
  await expect(page.getByTestId("nutrition-error")).toContainText(/set up/i);

  // Enter the four macros by hand and save.
  await page.getByTestId("nutrition-kcal").fill("350");
  await page.getByTestId("nutrition-protein").fill("12");
  await page.getByTestId("nutrition-carbs").fill("60");
  await page.getByTestId("nutrition-fat").fill("6");
  await page.getByTestId("nutrition-save").click();
  await expect(macros).toContainText("350");
  await expect(macros).toContainText("Your saved values");

  // The saved values survive a reload.
  await page.reload();
  await expect(page.getByTestId("macros")).toContainText("350");
  await expect(page.getByTestId("macros")).toContainText("Your saved values");
});
