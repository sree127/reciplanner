import { expect, test } from "@playwright/test";
import { apiClientFor, emailCode, signInWithCode, uniqueEmail } from "./helpers";

test("a household adds a recipe, rescales it, and both members see it", async ({ browser }) => {
  const ownerEmail = uniqueEmail("cook");
  const partnerEmail = uniqueEmail("taster");
  const owner = await (await browser.newContext()).newPage();
  await signInWithCode(owner, ownerEmail);
  await owner.getByLabel("Household name").fill("Test kitchen");
  await owner.getByRole("button", { name: "Create household" }).click();
  await owner.waitForURL("**/household?created=1");

  await owner.getByRole("link", { name: "Recipes" }).click();
  await owner.getByRole("link", { name: "Add a recipe" }).click();
  await owner.getByLabel("Title").fill("Weeknight soup");
  await owner.getByRole("button", { name: "Dinner" }).click();

  await owner.getByLabel("Quantity").first().fill("400");
  await owner.getByLabel("Ingredient").first().fill("Tomato");
  await owner.getByRole("option", { name: /^Tomato/ }).first().click();

  await owner.getByRole("button", { name: "+ Ingredient" }).click();
  await owner.getByLabel("Quantity").nth(1).fill("1");
  await owner.getByLabel("Unit").nth(1).selectOption("cup");
  await owner.getByLabel("Ingredient").nth(1).fill("House chili oil");
  await owner.getByRole("button", { name: "Add ingredient" }).click();
  await expect(owner.getByLabel("Ingredient").nth(1)).toHaveValue("House chili oil");

  await owner.getByRole("button", { name: "+ Ingredient" }).click();
  await owner.getByLabel("Ingredient").nth(2).fill("Salt");
  await owner.getByRole("option", { name: /^Salt/ }).first().click();
  await owner.getByRole("checkbox", { name: "To taste" }).nth(2).check();

  await owner.getByLabel("Step").fill("Simmer until it smells like dinner.");
  await owner.getByRole("button", { name: "Save recipe" }).click();
  await expect(owner.getByTestId("recipe-title")).toHaveText("Weeknight soup");

  const lines = owner.getByTestId("ingredient-line");
  await expect(lines.nth(0)).toContainText("400 g");
  await expect(lines.nth(0)).toContainText("Tomato");
  await expect(lines.nth(1)).toContainText("240 ml");
  await expect(lines.nth(1)).toContainText("House chili oil");
  await expect(lines.nth(2)).toContainText("to taste");

  const macros = owner.getByTestId("macros");
  await expect(macros).toContainText("Calories");
  await expect(macros).toContainText("House chili oil");
  await owner.screenshot({ path: "media/milestone-2-nutrition.png", fullPage: true });

  await owner.getByTestId("servings").fill("2");
  await expect(lines.nth(0)).toContainText("200 g");
  await expect(lines.nth(1)).toContainText("120 ml");
  await expect(lines.nth(2)).toContainText("to taste");

  await owner.goto("/?q=chili");
  await expect(owner.getByTestId("recipe-card")).toContainText("Weeknight soup");
  await owner.screenshot({ path: "test-results/milestone-2-recipe.png" });

  await owner.goto("/household");
  await owner.getByLabel("Their email").fill(partnerEmail);
  await owner.getByRole("button", { name: "Create invite" }).click();
  const inviteLink = (await owner.getByTestId("invite-link").first().textContent())!.trim();

  const partner = await (await browser.newContext()).newPage();
  await partner.goto(inviteLink);
  await partner.getByLabel("Email").fill(partnerEmail);
  const sentAt = Date.now();
  await partner.getByRole("button", { name: "Email me a sign-in code" }).click();
  await partner.getByLabel("Sign-in code").fill(await emailCode(partnerEmail, sentAt));
  await partner.getByRole("button", { name: "Sign in" }).click();
  await partner.getByRole("button", { name: "Join household" }).click();
  await expect(partner.getByTestId("recipe-card")).toContainText("Weeknight soup");
  await partner.getByRole("link", { name: /Weeknight soup/ }).click();
  await expect(partner.getByTestId("ingredient-line").nth(0)).toContainText("400 g");

  const outsider = await apiClientFor(uniqueEmail("outsider"));
  const { data } = await outsider.from("recipes").select("title");
  expect(data).toEqual([]);
  const { data: custom } = await outsider.from("ingredients").select("name").eq("name", "House chili oil");
  expect(custom).toEqual([]);
  const { data: catalog } = await outsider.from("ingredients").select("name").eq("name", "Salt, table");
  expect(catalog).toEqual([{ name: "Salt, table" }]);
});
