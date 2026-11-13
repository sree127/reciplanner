import { expect, test } from "@playwright/test";
import { apiClientFor, emailLink, requestCode, signInWithCode, uniqueEmail } from "./helpers";

test("two people share one household and see the same empty recipe book", async ({ browser }) => {
  const ownerEmail = uniqueEmail("sree");
  const partnerEmail = uniqueEmail("partner");
  const householdName = "Our kitchen";

  // Owner signs in with the 6-digit code and creates the household.
  const owner = await (await browser.newContext()).newPage();
  await signInWithCode(owner, ownerEmail);
  await expect(owner.getByRole("heading", { name: "Create your household" })).toBeVisible();
  await owner.getByLabel("Your name").fill("Sree");
  await owner.getByLabel("Household name").fill(householdName);
  await owner.getByRole("button", { name: "Create household" }).click();
  await owner.waitForURL("**/household?created=1");

  // Owner invites the partner by email and gets a shareable link.
  await owner.getByLabel("Their email").fill(partnerEmail);
  await owner.getByRole("button", { name: "Create invite" }).click();
  const inviteLink = (await owner.getByTestId("invite-link").first().textContent())!.trim();
  expect(inviteLink).toMatch(/\/invite\/[0-9a-f]{48}$/);

  // Partner opens the invite link, is sent to sign in, and uses the email link instead of the code.
  const partnerContext = await browser.newContext();
  const partner = await partnerContext.newPage();
  await partner.goto(inviteLink);
  await expect(partner).toHaveURL(/\/login\?next=%2Finvite%2F/);
  const sentAt = await requestCode(partner, partnerEmail);
  await partner.goto(await emailLink(partnerEmail, sentAt));
  await partner.waitForURL((url) => url.pathname === "/");

  // Home shows the pending invite for her email.
  await expect(partner.getByText("You've been invited")).toBeVisible();
  await partner.getByRole("link", { name: /Our kitchen/ }).click();
  await expect(partner.getByRole("heading", { name: /Sree invited you to Our kitchen/ })).toBeVisible();
  await partner.getByLabel("Your name").fill("Anu");
  await partner.getByRole("button", { name: "Join household" }).click();
  await partner.waitForURL("**/?joined=1");

  for (const page of [partner, owner]) {
    await page.goto("/");
    await expect(page.getByTestId("household-name")).toHaveText(householdName);
    await expect(page.getByTestId("shared-with")).toHaveText("Shared by Sree & Anu");
    await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  }

  await partner.screenshot({ path: "test-results/milestone-1-recipe-book.png" });
  await owner.goto("/household");
  await expect(owner.getByTestId("members")).toContainText("Anu");
  await owner.screenshot({ path: "test-results/milestone-1-household.png", fullPage: true });

  // The invite link is single-use.
  await partner.goto(inviteLink);
  await expect(partner.getByText(/already in Our kitchen/)).toBeVisible();

  // Leaving asks first, then returns the partner to onboarding; the owner keeps the household.
  partner.once("dialog", (dialog) => dialog.accept());
  await partner.goto("/household");
  await partner.getByRole("button", { name: "Leave household" }).click();
  await expect(partner.getByRole("heading", { name: "Create your household" })).toBeVisible();
  await owner.goto("/");
  await expect(owner.getByTestId("shared-with")).toHaveText("Shared by Sree");
});

test("row-level security keeps other households out", async () => {
  const owner = await apiClientFor(uniqueEmail("owner"));
  const outsider = await apiClientFor(uniqueEmail("outsider"));

  const { data: householdId, error } = await owner.rpc("create_household", { p_name: "Private" });
  expect(error).toBeNull();
  const { data: token } = await owner.rpc("create_invite", { p_email: "someone@example.com" });
  const { error: recipeError } = await owner
    .from("recipes")
    .insert({ household_id: householdId!, title: "Secret soup" });
  expect(recipeError).toBeNull();

  // Outsider sees nothing.
  for (const table of ["households", "household_members", "household_invites", "recipes"] as const) {
    const { data } = await outsider.from(table).select("*");
    expect(data, table).toEqual([]);
  }

  // Outsider can't add themselves, add recipes, or use someone else's invite.
  const { error: joinError } = await outsider
    .from("household_members")
    .insert({ household_id: householdId!, user_id: (await outsider.auth.getUser()).data.user!.id });
  expect(joinError).not.toBeNull();

  const { error: insertError } = await outsider
    .from("recipes")
    .insert({ household_id: householdId!, title: "Spam" });
  expect(insertError).not.toBeNull();

  const { error: acceptError } = await outsider.rpc("accept_invite", { p_token: token! });
  expect(acceptError?.message).toMatch(/This invite is for someone@example.com/);

  // Recipes are household-only in the MVP.
  const { error: publicError } = await owner
    .from("recipes")
    .insert({ household_id: householdId!, title: "Public soup", visibility: "public" });
  expect(publicError?.message).toMatch(/recipes_visibility_household_only/);

  const { data: ownerRecipes } = await owner.from("recipes").select("title");
  expect(ownerRecipes).toEqual([{ title: "Secret soup" }]);
});
