import type { Metadata } from "next";
import Link from "next/link";
import { Card, ErrorText } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { getMyHousehold } from "@/lib/data";
import { getShoppingLists } from "@/lib/shopping";
import { createList } from "./actions";

export const metadata: Metadata = { title: "Shopping lists" };

export default async function ListsPage({ searchParams }: PageProps<"/lists">) {
  const household = await getMyHousehold();
  if (!household) {
    return (
      <Card className="text-center">
        <p className="text-stone-700">Create a household first to share shopping lists.</p>
        <Link href="/" className="mt-4 inline-flex h-11 items-center rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white">
          Go home
        </Link>
      </Card>
    );
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const lists = await getShoppingLists();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-900">Shopping lists</h1>

      {error && <ErrorText message={error} />}

      {lists.length === 0 ? (
        <Card className="py-8 text-center">
          <p aria-hidden className="text-4xl">🛒</p>
          <h2 className="mt-3 text-lg font-semibold text-stone-900">No lists yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-stone-600">
            Create a list, then add a recipe&apos;s ingredients to it from any recipe.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {lists.map((list) => (
            <li key={list.id}>
              <Link
                href={`/lists/${list.id}`}
                data-testid="list-card"
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-stone-900">{list.name}</span>
                    {list.isDefault && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">Default</span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-stone-500">
                    {list.itemCount === 0
                      ? "Empty"
                      : `${list.checkedCount}/${list.itemCount} ticked`}
                  </span>
                </span>
                <span aria-hidden className="text-stone-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">New list</h2>
        <form action={createList} className="space-y-3">
          <input
            name="name"
            required
            maxLength={60}
            placeholder="Weekly shop"
            aria-label="List name"
            className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base"
          />
          <SubmitButton pendingText="Creating…">Create list</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
