function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See README.md → Environment variables.`);
  }
  return value;
}

// Accepts the project URL with or without a trailing "/rest/v1/".
export function supabaseUrl(): string {
  return required("SUPABASE_URL").replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

export function supabasePublishableKey(): string {
  return required("SUPABASE_PUBLISHABLE_KEY");
}

// The URL and publishable key are browser-safe (all access is limited by row-level
// security), so a server component may hand them to a client component that opens a
// realtime connection. This keeps the app's single pair of env var names.
export function publicSupabaseConfig(): { url: string; key: string } {
  return { url: supabaseUrl(), key: supabasePublishableKey() };
}
