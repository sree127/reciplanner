import { expect, test } from "@playwright/test";
import { signInWithCode, uniqueEmail } from "./helpers";

test("estimates believable macros, then edits and keeps them by hand", async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await signInWithCode(page, uniqueEmail("nutrition"));
  await page.getByLabel("Household name").fill("Macro house");
  await page.getByRole("button", { name: "Create household" }).click();
  await page.waitForURL("**/household?created=1");

  // A recipe with 400 g firm tofu over the default 4 servings.
  await page.getByRole("link", { name: "Recipes" }).click();
  await page.getByRole("link", { name: "Add a recipe" }).click();
  await page.getByLabel("Title").fill("Tofu bowl");
  await page.getByLabel("Quantity").first().fill("400");
  await page.getByLabel("Ingredient").first().fill("Tofu");
  await page.getByRole("option", { name: /Tofu, firm/ }).first().click();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByTestId("recipe-title")).toHaveText("Tofu bowl");

  const macros = page.getByTestId("macros");

  // Estimate (no API key in tests): the database-backed estimate still fills believable numbers.
  // 400 g firm tofu over 4 servings is ~17 g protein per serving — the bug produced ~11 g.
  await macros.getByTestId("nutrition-estimate").first().click();
  await expect(page.getByTestId("nutrition-protein")).not.toHaveValue("");
  const protein = Number(await page.getByTestId("nutrition-protein").inputValue());
  expect(protein).toBeGreaterThan(14);
  const kcal = Number(await page.getByTestId("nutrition-kcal").inputValue());
  expect(kcal).toBeGreaterThan(100);

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
