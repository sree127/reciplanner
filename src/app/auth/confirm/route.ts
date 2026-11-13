import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Handles both the token_hash link from our email templates and the PKCE `code` from
// Supabase's default templates or Google sign-in.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let failed = true;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }

  const url = request.nextUrl.clone();
  url.search = "";
  if (failed) {
    url.pathname = "/login";
    url.searchParams.set("error", "That sign-in link has expired or was already used. Request a new code.");
  } else {
    const target = new URL(next, request.nextUrl.origin);
    url.pathname = target.pathname;
    url.search = target.search;
  }
  return NextResponse.redirect(url);
}
