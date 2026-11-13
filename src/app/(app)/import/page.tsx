import type { Metadata } from "next";
import Link from "next/link";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import a recipe" };

export default function ImportPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Import from a link</h1>
        <p className="mt-1 text-sm text-stone-600">
          Paste a recipe link. We read the ingredients and shorten the method to a few steps, then
          you check it over before saving. It links back to the original page.
        </p>
      </div>

      <ImportForm />

      <p className="text-sm text-stone-500">
        Most recipe sites work. If a page can&apos;t be read, you can always{" "}
        <Link href="/recipes/new" className="font-semibold text-orange-700 underline">
          add the recipe by hand
        </Link>
        .
      </p>
    </div>
  );
}
