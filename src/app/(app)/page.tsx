import Link from "next/link";
import { Avatar, Card } from "@/components/ui";
import { getMembers, getMyHousehold, getMyProfileName, requireUser } from "@/lib/data";
import { CreateHouseholdForm } from "./forms";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const household = await getMyHousehold();
  if (!household) return <Onboarding />;

  const { joined } = await searchParams;
  const { supabase } = await requireUser();
  const [members, { data: recipes, error }] = await Promise.all([
    getMembers(household.id),
    supabase
      .from("recipes")
      .select("id, title, servings, total_min")
      .eq("household_id", household.id)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;

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

      {recipes.length === 0 ? (
        <Card className="py-10 text-center">
          <p aria-hidden className="text-4xl">📖</p>
          <h2 className="mt-3 text-lg font-semibold text-stone-900">No recipes yet</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-stone-600">
            Your shared recipe book is ready. Adding recipes comes in the next update.
          </p>
          {members.length < 2 && (
            <Link
              href="/household"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white"
            >
              Invite someone to share it
            </Link>
          )}
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <Card>
                <h2 className="font-semibold text-stone-900">{r.title}</h2>
                <p className="text-sm text-stone-500">
                  {[r.servings && `Serves ${r.servings}`, r.total_min && `${r.total_min} min`].filter(Boolean).join(" · ")}
                </p>
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
