import type { Metadata } from "next";
import Link from "next/link";
import { ListItems } from "@/components/list-items";
import { SubmitButton } from "@/components/submit-button";
import { getList } from "@/lib/shopping";
import { publicSupabaseConfig } from "@/lib/supabase/env";
import { deleteList, renameList, setDefaultList } from "../actions";

export const metadata: Metadata = { title: "Shopping list" };

export default async function ListDetailPage({ params }: PageProps<"/lists/[id]">) {
  const { id } = await params;
  const list = await getList(id);
  const config = publicSupabaseConfig();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/lists" className="text-stone-400" aria-label="Back to lists">‹</Link>
        <h1 className="flex-1 truncate text-2xl font-bold text-stone-900" data-testid="list-name">{list.name}</h1>
        {list.isDefault && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">Default</span>
        )}
      </div>

      <ListItems listId={list.id} initialItems={list.items} config={config} />

      <details className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
        <summary className="cursor-pointer text-sm font-semibold text-stone-700">Manage list</summary>
        <div className="mt-3 space-y-4">
          <form action={renameList} className="space-y-2">
            <input type="hidden" name="id" value={list.id} />
            <label className="block text-sm font-medium text-stone-700">Rename</label>
            <div className="flex gap-2">
              <input
                name="name"
                defaultValue={list.name}
                maxLength={60}
                aria-label="Rename list"
                className="h-11 flex-1 rounded-xl border border-stone-300 px-3 text-base"
              />
              <button type="submit" className="h-11 rounded-xl bg-white px-4 text-sm font-semibold text-stone-800 ring-1 ring-stone-300">
                Save
              </button>
            </div>
          </form>

          {!list.isDefault && (
            <form action={setDefaultList}>
              <input type="hidden" name="id" value={list.id} />
              <SubmitButton variant="secondary" pendingText="Setting…">Make this the default list</SubmitButton>
            </form>
          )}

          <form action={deleteList}>
            <input type="hidden" name="id" value={list.id} />
            <SubmitButton variant="danger" pendingText="Deleting…">Delete list</SubmitButton>
          </form>
        </div>
      </details>
    </div>
  );
}
