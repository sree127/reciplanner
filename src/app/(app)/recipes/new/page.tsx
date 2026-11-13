import type { Metadata } from "next";
import { RecipeEditor, type EditorInitial } from "@/components/recipe-editor";
import { getCategories } from "@/lib/recipes";

export const metadata: Metadata = { title: "New recipe" };

const initial: EditorInitial = {
  title: "",
  description: "",
  servings: "4",
  yieldQty: "",
  yieldLabel: "",
  prepMin: "",
  cookMin: "",
  notes: "",
  photoUrl: "",
  categoryIds: [],
  tags: [],
  lines: [
    {
      key: "ingredient-1",
      type: "ingredient",
      qty: "",
      unitToken: "g",
      ingredientId: null,
      ingredientName: "",
      density: null,
      portions: [],
      note: "",
      optional: false,
      toTaste: false,
    },
    { key: "step-1", type: "step", text: "", timerMin: "" },
  ],
};

export default async function NewRecipePage() {
  const categories = await getCategories();
  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">New recipe</h1>
      <RecipeEditor initial={initial} categories={categories.map((c) => ({ id: c.id, name: c.name }))} draftKey="reciplanner-new-recipe" />
    </>
  );
}
