"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** A browser Supabase client, used for realtime subscriptions and ticking shopping-list
 * items. The URL and publishable key come from the server as props (they are browser-safe;
 * row-level security limits every request). */
export function createBrowserSupabase(url: string, key: string) {
  return createBrowserClient<Database>(url, key);
}
