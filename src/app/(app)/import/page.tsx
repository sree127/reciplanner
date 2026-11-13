import type { Metadata } from "next";
import Link from "next/link";
import { ErrorText } from "@/components/ui";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import a recipe" };

export default async function ImportPage({ searchParams }: PageProps<"/import">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Import from a link</h1>
        <p className="mt-1 text-sm text-stone-600">
          Paste a recipe link and we&apos;ll save it for you. We read the recipe card most food
          sites include at the end of the page — the ingredients and method — convert the amounts to
          metric, and shorten the steps. The saved recipe links back to the original page.
        </p>
      </div>

      {error && <ErrorText message={error} />}

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
