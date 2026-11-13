import Link from "next/link";
import { RecipeView } from "@/components/recipe-view";
import { getRecipe } from "@/lib/recipes";
import { deleteRecipe, toggleFavorite } from "../actions";

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function RecipePage({ params, searchParams }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const imported = typeof query.imported === "string";
  const newCount = imported ? Number(query.imported) || 0 : 0;
  const recipe = await getRecipe(id);

  return (
    <>
      {imported && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200" data-testid="imported-note">
          Imported and saved.{" "}
          {newCount > 0
            ? `${newCount} new ${newCount === 1 ? "ingredient was" : "ingredients were"} added to your catalog — tap Edit to set amounts or nutrition.`
            : "Check the amounts below and edit anything that looks off."}
        </p>
      )}
      {recipe.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.photoUrl} alt="" className="h-48 w-full rounded-2xl object-cover" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900" data-testid="recipe-title">{recipe.title}</h1>
          {recipe.author && <p className="text-sm text-stone-500">Added by {recipe.author}</p>}
        </div>
        <form action={toggleFavorite}>
          <input type="hidden" name="id" value={recipe.id} />
          <input type="hidden" name="favorite" value={recipe.favorite ? "false" : "true"} />
          <button type="submit" aria-label={recipe.favorite ? "Unfavorite" : "Favorite"} className="text-2xl text-orange-600">
            {recipe.favorite ? "★" : "☆"}
          </button>
        </form>
      </div>
      {recipe.description && <p className="text-stone-700">{recipe.description}</p>}
      {recipe.sourceUrl && (
        <p className="text-sm text-stone-600" data-testid="recipe-source">
          From{" "}
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-orange-700 underline">
            {sourceHost(recipe.sourceUrl)}
          </a>
          {recipe.sourceAuthor ? ` · ${recipe.sourceAuthor}` : ""}
        </p>
      )}
      <p className="text-sm text-stone-600">
        {[recipe.prepMin != null && `Prep ${recipe.prepMin} min`, recipe.cookMin != null && `Cook ${recipe.cookMin} min`, recipe.totalMin != null && `${recipe.totalMin} min total`]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {(recipe.categories.length > 0 || recipe.tags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {recipe.categories.map((c) => (
            <Link key={c.id} href={`/?category=${c.id}`} className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-900">
              {c.name}
            </Link>
          ))}
          {recipe.tags.map((tag) => (
            <Link key={tag} href={`/?q=${encodeURIComponent(tag)}`} className="rounded-full bg-stone-200 px-3 py-1 text-sm text-stone-700">
              {tag}
            </Link>
          ))}
        </div>
      )}
      <RecipeView recipe={recipe} />
      {recipe.notes && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-semibold text-stone-900">Notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-stone-700">{recipe.notes}</p>
        </section>
      )}
      <div className="flex gap-2">
        <Link href={`/recipes/${recipe.id}/edit`} className="flex h-12 flex-1 items-center justify-center rounded-xl bg-white text-base font-semibold ring-1 ring-stone-300">
          Edit
        </Link>
        <form action={deleteRecipe} className="flex-1">
          <input type="hidden" name="id" value={recipe.id} />
          <button type="submit" className="h-12 w-full rounded-xl text-base font-semibold text-red-700 ring-1 ring-red-200">
            Delete
          </button>
        </form>
      </div>
    </>
  );
}
