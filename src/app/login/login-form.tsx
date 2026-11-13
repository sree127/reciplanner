"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ErrorText, Field } from "@/components/ui";
import { sendCode, verifyCode, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [sent, send] = useActionState(sendCode, { step: "email", email: "", next } as LoginState);
  const [verified, verify] = useActionState(verifyCode, { step: "code", email: "", next } as LoginState);

  if (sent.step === "email") {
    return (
      <form action={send} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={sent.email}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          required
        />
        <ErrorText message={sent.error} />
        <SubmitButton pendingText="Sending…">Email me a sign-in code</SubmitButton>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        We emailed <strong className="text-stone-900">{sent.email}</strong>. Tap the sign-in link on
        this phone, in this browser. If the email has a code, type it here instead.
      </p>
      <form action={verify} className="space-y-4">
        <input type="hidden" name="email" value={sent.email} />
        <input type="hidden" name="next" value={next} />
        <Field
          label="Sign-in code"
          name="code"
          placeholder="123456"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={10}
          required
        />
        <ErrorText message={verified.error} />
        <SubmitButton pendingText="Checking…">Sign in</SubmitButton>
      </form>
      <form action={send}>
        <input type="hidden" name="email" value={sent.email} />
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="w-full py-2 text-sm font-medium text-orange-700">
          Send a new code
        </button>
      </form>
    </div>
  );
}
