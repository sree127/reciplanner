"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800",
    secondary: "bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-50",
    danger: "bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-50",
  }[variant];

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`h-12 w-full rounded-xl px-4 text-base font-semibold transition disabled:opacity-60 ${styles}`}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}
