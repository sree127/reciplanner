import type { Metadata } from "next";
import { RecipeEditor, type EditorInitial } from "@/components/recipe-editor";
import type { IngredientLine, RecipeDetail } from "@/lib/recipes";
import { getCategories, getRecipe } from "@/lib/recipes";

export const metadata: Metadata = { title: "Edit recipe" };

function qtyText(value: number | null): string {
  if (value == null) return "";
  return String(Math.round(value * 1000) / 1000);
}

function unitToken(line: IngredientLine): string {
  if (line.unitId) return line.unitId;
  if (line.unitLabel && line.unitLabel !== "to taste" && line.qtyMin && line.grams) {
    return `portion|${line.grams / line.qtyMin}|${line.unitLabel}`;
  }
  return "g";
}

function toInitial(recipe: RecipeDetail): EditorInitial {
  const sectionOf = new Map(recipe.sections.map((s) => [s.key, s]));
  const lines: EditorInitial["lines"] = [];
  const pushSection = (id: string | null) => {
    if (!id || lines.some((line) => line.type === "section" && line.key === id)) return;
    const section = sectionOf.get(id);
    if (section) lines.push({ key: section.key, type: "section", title: section.title });
  };
  const ordered = [
    ...recipe.ingredients.map((line) => ({ kind: "ingredient" as const, sectionId: line.sectionId, line })),
    ...recipe.steps.map((line) => ({ kind: "step" as const, sectionId: line.sectionId, line })),
  ];
  // Keep each section's ingredients, then its steps, unsectioned items first.
  const sectionIds = [null, ...recipe.sections.map((s) => s.key)];
  for (const sectionId of sectionIds) {
    for (const item of ordered.filter((item) => item.sectionId === sectionId)) {
      pushSection(sectionId);
      if (item.kind === "ingredient") {
        const line = item.line;
        lines.push({
          key: line.key,
          type: "ingredient",
          qty: qtyText(line.qtyMin),
          unitToken: unitToken(line),
          ingredientId: line.ingredientId,
          ingredientName: line.name,
          density: null,
          portions: line.unitLabel && line.unitLabel !== "to taste" && line.grams && line.qtyMin
            ? [{ label: line.unitLabel, grams: line.grams / line.qtyMin, unitId: null }]
            : [],
          note: line.note ?? "",
          optional: line.optional,
          toTaste: line.unitLabel === "to taste",
        });
      } else {
        lines.push({
          key: item.line.key,
          type: "step",
          text: item.line.text,
          timerMin: item.line.timerSec ? String(Math.round(item.line.timerSec / 60)) : "",
        });
      }
    }
  }

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description ?? "",
    servings: qtyText(recipe.servings),
    yieldQty: qtyText(recipe.yieldQty),
    yieldLabel: recipe.yieldLabel ?? "",
    prepMin: recipe.prepMin == null ? "" : String(recipe.prepMin),
    cookMin: recipe.cookMin == null ? "" : String(recipe.cookMin),
    notes: recipe.notes ?? "",
    photoUrl: recipe.photoUrl ?? "",
    categoryIds: recipe.categories.map((c) => c.id),
    tags: recipe.tags,
    lines,
  };
}

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  const [recipe, categories] = await Promise.all([getRecipe(id), getCategories()]);
  const initial = toInitial(recipe);
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Edit recipe</h1>
      <RecipeEditor initial={initial} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
