import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { Card, ErrorText } from "@/components/ui";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const error = typeof params.error === "string" ? params.error : null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect(next);

  const googleEnabled = process.env.ENABLE_GOOGLE_LOGIN === "true";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-2xl">
          <span aria-hidden>🍲</span>
        </div>
        <h1 className="text-2xl font-bold text-stone-900">Reciplanner</h1>
        <p className="mt-1 text-stone-600">Your household&apos;s recipe book</p>
      </div>
      <Card className="space-y-4">
        <ErrorText message={error} />
        <LoginForm next={next} />
        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-stone-400">
              <span className="h-px flex-1 bg-stone-200" /> or <span className="h-px flex-1 bg-stone-200" />
            </div>
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next} />
              <SubmitButton variant="secondary" pendingText="Opening Google…">
                Continue with Google
              </SubmitButton>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}
