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
