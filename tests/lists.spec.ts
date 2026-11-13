import { expect, test } from "@playwright/test";
import { emailCode, signInWithCode, uniqueEmail } from "./helpers";

test("add a recipe to a list (merging duplicates) and tick it live across members", async ({ browser }) => {
  const ownerEmail = uniqueEmail("shopper");
  const partnerEmail = uniqueEmail("partner");

  const owner = await (await browser.newContext()).newPage();
  await signInWithCode(owner, ownerEmail);
  await owner.getByLabel("Household name").fill("Shop house");
  await owner.getByRole("button", { name: "Create household" }).click();
  await owner.waitForURL("**/household?created=1");

  // Create a shopping list.
  await owner.goto("/lists");
  await owner.getByLabel("List name").fill("Weekly shop");
  await owner.getByRole("button", { name: "Create list" }).click();
  await owner.waitForURL(/\/lists\/[0-9a-f-]+/);

  // Add a recipe with a weighed ingredient.
  await owner.getByRole("link", { name: "Recipes" }).click();
  await owner.getByRole("link", { name: "Add a recipe" }).click();
  await owner.getByLabel("Title").fill("Tomato base");
  await owner.getByLabel("Quantity").first().fill("400");
  await owner.getByLabel("Ingredient").first().fill("Tomato");
  await owner.getByRole("option", { name: /^Tomato/ }).first().click();
  await owner.getByRole("button", { name: "Save recipe" }).click();
  await expect(owner.getByTestId("recipe-title")).toHaveText("Tomato base");

  // Add the recipe twice; the two tomato lines merge into one 800 g line.
  const addButton = owner.getByRole("button", { name: "Add to shopping list" });
  await addButton.click();
  await expect(owner.getByTestId("add-to-list-message")).toContainText("Added 1 ingredient");
  await addButton.click();
  await expect(owner.getByTestId("add-to-list-message")).toContainText("Added 1 ingredient");

  await owner.goto("/lists");
  await owner.getByTestId("list-card").first().click();
  const items = owner.getByTestId("list-item");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("800 g");
  await expect(items.first()).toContainText("Tomato base");

  // A second member joins and opens the same list.
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
  await partner.goto("/lists");
  await partner.getByTestId("list-card").first().click();
  const partnerItem = partner.getByTestId("list-item").first();
  await expect(partnerItem).toContainText("800 g");

  // The owner ticks the item; the partner sees it checked within the sync window.
  await owner.goto("/lists");
  await owner.getByTestId("list-card").first().click();
  await owner.getByTestId("list-item").first().getByRole("checkbox").check();
  await expect(partnerItem.getByRole("checkbox")).toBeChecked({ timeout: 8000 });
});
