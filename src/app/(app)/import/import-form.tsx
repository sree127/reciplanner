"use client";

import { useFormStatus } from "react-dom";
import { startImport } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center rounded-xl bg-orange-600 text-base font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Reading the page…" : "Import and save"}
    </button>
  );
}

export function ImportForm() {
  return (
    <form action={startImport} className="space-y-3">
      <input
        name="url"
        type="url"
        required
        inputMode="url"
        autoComplete="off"
        placeholder="https://example.com/best-pasta"
        aria-label="Recipe link"
        className="h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900"
      />
      <SubmitButton />
    </form>
  );
}
