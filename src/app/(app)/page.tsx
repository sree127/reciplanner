import Link from "next/link";
import { Avatar, Card } from "@/components/ui";
import { getMembers, getMyHousehold, getMyProfileName, requireUser } from "@/lib/data";
import { getCategories, searchRecipeCards } from "@/lib/recipes";
import { toggleFavorite } from "./recipes/actions";
import { CreateHouseholdForm } from "./forms";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const household = await getMyHousehold();
  if (!household) return <Onboarding />;

  const params = await searchParams;
  const joined = params.joined;
  const query = typeof params.q === "string" ? params.q : "";
  const categoryParam = typeof params.category === "string" ? params.category : null;
  const category = categoryParam && /^[0-9a-f-]{36}$/i.test(categoryParam) ? categoryParam : null;
  const has = typeof params.has === "string" ? params.has : "";
  const lacks = typeof params.lacks === "string" ? params.lacks : "";
  const sort = params.sort === "az" || params.sort === "favorites" ? params.sort : "newest";
  const maxMin = typeof params.max === "string" && params.max ? Number(params.max) : null;
  const [members, recipes, categories] = await Promise.all([
    getMembers(household.id),
    searchRecipeCards({ query, category, has, lacks, maxMin: Number.isFinite(maxMin) ? maxMin : null, sort }),
    getCategories(),
  ]);
  const filtering = Boolean(query || category || has || lacks || maxMin);

  return (
    <>
      {joined && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200">
          You joined {household.name}.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Recipe book</p>
          <h1 className="truncate text-2xl font-bold text-stone-900" data-testid="household-name">
            {household.name}
          </h1>
        </div>
        <Link href="/household" className="flex -space-x-2" aria-label="Household members">
          {members.map((m) => (
            <span key={m.userId} className="rounded-full ring-2 ring-stone-50">
              <Avatar name={m.name} />
            </span>
          ))}
        </Link>
      </div>
      <p className="text-sm text-stone-600" data-testid="shared-with">
        Shared by {members.map((m) => m.name).join(" & ")}
      </p>

      <form action="/" className="space-y-3">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search name, ingredient, or tag"
          aria-label="Search"
          className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base"
        />
        <div className="flex gap-2">
          <select name="sort" defaultValue={sort} aria-label="Sort" className="h-12 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-base">
            <option value="newest">Newest</option>
            <option value="az">A–Z</option>
            <option value="favorites">Favorites</option>
          </select>
          <button type="submit" className="h-12 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white">Search</button>
        </div>
        <details className="rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200">
          <summary className="cursor-pointer text-sm font-semibold text-stone-700">Filters</summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm">
              Category
              <select name="category" defaultValue={category ?? ""} className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3">
                <option value="">Any</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Max minutes
              <input name="max" defaultValue={params.max ?? ""} inputMode="numeric" className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3" />
            </label>
            <label className="block text-sm">
              Has ingredient
              <input name="has" defaultValue={has} className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3" />
            </label>
            <label className="block text-sm">
              Without ingredient
              <input name="lacks" defaultValue={lacks} className="mt-1 h-12 w-full rounded-xl border border-stone-300 px-3" />
            </label>
          </div>
        </details>
      </form>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/recipes/new" className="flex h-12 items-center justify-center rounded-xl bg-orange-600 text-base font-semibold text-white">
          Add a recipe
        </Link>
        <Link href="/import" className="flex h-12 items-center justify-center rounded-xl bg-white text-base font-semibold text-stone-800 ring-1 ring-stone-300">
          Import from a link
        </Link>
      </div>

      {recipes.length === 0 ? (
        <Card className="py-10 text-center">
          <p aria-hidden className="text-4xl">📖</p>
          <h2 className="mt-3 text-lg font-semibold text-stone-900">{filtering ? "No matching recipes" : "No recipes yet"}</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-stone-600">
            {filtering ? "Try a different search." : "Add one above. Your household sees the same book."}
          </p>
          {!filtering && members.length < 2 && (
            <Link href="/household" className="mt-5 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-stone-800 ring-1 ring-stone-300">
              Invite someone to share it
            </Link>
          )}
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {recipes.map((r) => (
            <li key={r.id} data-testid="recipe-card">
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/recipes/${r.id}`} className="min-w-0 flex-1">
                    {r.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.photoUrl} alt="" className="mb-3 h-32 w-full rounded-xl object-cover" />
                    )}
                    <h2 className="font-semibold text-stone-900">{r.title}</h2>
                    <p className="text-sm text-stone-500">
                      {[r.categories.join(", "), r.servings && `Serves ${r.servings}`, r.totalMin && `${r.totalMin} min`].filter(Boolean).join(" · ")}
                    </p>
                  </Link>
                  <form action={toggleFavorite}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="favorite" value={r.favorite ? "false" : "true"} />
                    <button type="submit" aria-label={r.favorite ? "Unfavorite" : "Favorite"} className="text-xl text-orange-600">
                      {r.favorite ? "★" : "☆"}
                    </button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Onboarding() {
  const { supabase } = await requireUser();
  const [{ data: invites }, name] = await Promise.all([supabase.rpc("my_pending_invites"), getMyProfileName()]);

  return (
    <>
      <h1 className="text-2xl font-bold text-stone-900">Welcome</h1>

      {invites && invites.length > 0 && (
        <Card className="space-y-3 ring-orange-300">
          <h2 className="text-lg font-semibold text-stone-900">You&apos;ve been invited</h2>
          <ul className="space-y-2">
            {invites.map((i) => (
              <li key={i.token}>
                <Link
                  href={`/invite/${i.token}`}
                  className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3 ring-1 ring-orange-200"
                >
                  <span>
                    <span className="block font-semibold text-stone-900">{i.household_name}</span>
                    <span className="block text-sm text-stone-600">from {i.invited_by_name}</span>
                  </span>
                  <span className="text-sm font-semibold text-orange-700">Join →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            {invites && invites.length > 0 ? "Or start your own household" : "Create your household"}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            A household shares one recipe book and shopping lists. You can invite your partner next.
          </p>
        </div>
        <CreateHouseholdForm defaultName={name} />
      </Card>
    </>
  );
}
