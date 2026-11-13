import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const MAILPIT = () => process.env.LOCAL_MAILPIT_URL!;

type MailpitMessage = { ID: string; To: { Address: string }[]; Created: string };

export function uniqueEmail(name: string) {
  return `${name}.${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
}

async function latestEmailFor(email: string, after: number) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT()}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = (await res.json()) as { messages: MailpitMessage[] };
    const fresh = messages.find((m) => new Date(m.Created).getTime() >= after - 1000);
    if (fresh) {
      const full = await (await fetch(`${MAILPIT()}/api/v1/message/${fresh.ID}`)).json();
      return full as { HTML: string; Text: string };
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email arrived for ${email}`);
}

export async function emailCode(email: string, after: number) {
  const msg = await latestEmailFor(email, after);
  const code = msg.Text.match(/\b(\d{6,10})\b/)?.[1];
  if (!code) throw new Error("No code in email");
  return code;
}

export async function emailLink(email: string, after: number) {
  const msg = await latestEmailFor(email, after);
  const href = msg.HTML.match(/href="([^"]*\/auth\/confirm[^"]*)"/)?.[1];
  if (!href) throw new Error("No sign-in link in email");
  return href.replace(/&amp;/g, "&");
}

export async function requestCode(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  const sentAt = Date.now();
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await expect(page.getByLabel("Sign-in code")).toBeVisible();
  return sentAt;
}

export async function signInWithCode(page: Page, email: string) {
  const sentAt = await requestCode(page, email);
  await page.getByLabel("Sign-in code").fill(await emailCode(email, sentAt));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function apiClientFor(email: string) {
  const supabase = createClient(process.env.LOCAL_SUPABASE_URL!, process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const sentAt = Date.now();
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: await emailCode(email, sentAt),
    type: "email",
  });
  if (verifyError) throw verifyError;
  return supabase;
}
