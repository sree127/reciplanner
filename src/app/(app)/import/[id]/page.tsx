import Link from "next/link";
import { notFound } from "next/navigation";
import { RecipeEditor, type EditorInitial } from "@/components/recipe-editor";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/data";
import { getCategories } from "@/lib/recipes";
import type { ReviewData } from "../actions";

export default async function ImportReviewPage({ params }: PageProps<"/import/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: job, error } = await supabase
    .from("import_jobs")
    .select("id, url, status, error, parsed_json")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!job) notFound();

  if (job.status === "error" || !job.parsed_json) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-stone-900">Couldn&apos;t import that link</h1>
        <Card className="space-y-2">
          <p className="text-sm text-stone-700">{job.error ?? "Something went wrong reading that page."}</p>
          <p className="break-all text-xs text-stone-500">{job.url}</p>
        </Card>
        <div className="flex gap-2">
          <Link href="/import" className="flex h-12 flex-1 items-center justify-center rounded-xl bg-orange-600 text-sm font-semibold text-white">
            Try another link
          </Link>
          <Link href="/recipes/new" className="flex h-12 flex-1 items-center justify-center rounded-xl bg-white text-sm font-semibold text-stone-800 ring-1 ring-stone-300">
            Add by hand
          </Link>
        </div>
      </div>
    );
  }

  const review = job.parsed_json as unknown as ReviewData;
  const categories = await getCategories();

  const initial: EditorInitial = {
    title: review.title,
    description: review.description,
    servings: review.servings,
    yieldQty: "",
    yieldLabel: "",
    prepMin: review.prepMin,
    cookMin: review.cookMin,
    notes: "",
    photoUrl: review.photoUrl,
    categoryIds: [],
    tags: [],
    sourceUrl: review.sourceUrl,
    sourceType: "web",
    sourceAuthor: review.sourceAuthor,
    stepsStyle: "short",
    lines: [
      ...review.ingredients.map((ing) => ({
        key: crypto.randomUUID(),
        type: "ingredient" as const,
        qty: ing.toTaste ? "" : ing.qtyText,
        unitToken: ing.unitToken || "g",
        ingredientId: ing.ingredientId,
        ingredientName: ing.matchedName ?? ing.name,
        density: ing.density,
        portions: ing.portions,
        note: ing.note,
        optional: false,
        toTaste: ing.toTaste,
      })),
      ...review.steps.map((text) => ({ key: crypto.randomUUID(), type: "step" as const, text, timerMin: "" })),
    ],
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-900">Review imported recipe</h1>
      <RecipeEditor
        initial={initial}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        draftKey={`reciplanner-import-${job.id}`}
      />
    </div>
  );
}
