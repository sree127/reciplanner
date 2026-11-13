import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { ShareInvite } from "@/components/share-invite";
import { Avatar, Card } from "@/components/ui";
import { getMembers, getMyHousehold, getMyProfileName, requireUser } from "@/lib/data";
import { revokeInvite } from "../actions";
import { InviteForm, LeaveHouseholdForm, NameForm } from "../forms";

export const metadata: Metadata = { title: "Household" };

export default async function HouseholdPage({ searchParams }: PageProps<"/household">) {
  const household = await getMyHousehold();
  if (!household) redirect("/");

  const { created } = await searchParams;
  const { supabase, userId, email } = await requireUser();
  const [members, name, { data: invites }] = await Promise.all([
    getMembers(household.id),
    getMyProfileName(),
    supabase
      .from("household_invites")
      .select("id, email, token, expires_at")
      .eq("household_id", household.id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      {created && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200">
          {household.name} is ready. Next: invite your partner below.
        </p>
      )}

      <h1 className="text-2xl font-bold text-stone-900">{household.name}</h1>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">Members</h2>
        <ul className="divide-y divide-stone-100" data-testid="members">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 py-2.5">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-stone-900">
                  {m.name}
                  {m.userId === userId && <span className="text-stone-500"> (you)</span>}
                </p>
                <p className="truncate text-sm text-stone-500">{m.email}</p>
              </div>
              {m.role === "owner" && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">Owner</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Invite someone</h2>
          <p className="mt-1 text-sm text-stone-600">
            Enter their email, then send them the link. They sign in with that email and tap Join.
          </p>
        </div>
        <InviteForm />
        {invites && invites.length > 0 && (
          <div className="space-y-3 border-t border-stone-100 pt-4">
            <h3 className="text-sm font-semibold text-stone-700">Waiting to join</h3>
            {invites.map((i) => (
              <div key={i.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-stone-900">{i.email}</p>
                  <form action={revokeInvite}>
                    <input type="hidden" name="invite_id" value={i.id} />
                    <button type="submit" className="text-sm font-medium text-red-700">
                      Cancel
                    </button>
                  </form>
                </div>
                <ShareInvite token={i.token} email={i.email} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-stone-900">You</h2>
        <p className="text-sm text-stone-600">Signed in as {email}</p>
        <NameForm defaultName={name} />
        <form action="/auth/signout" method="post">
          <SubmitButton variant="secondary" pendingText="Signing out…">Sign out</SubmitButton>
        </form>
        <LeaveHouseholdForm lastMember={members.length === 1} />
      </Card>
    </>
  );
}
