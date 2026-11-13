import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { getMyHousehold, getMyProfileName, requireUser } from "@/lib/data";
import { AcceptInviteForm } from "../../forms";

export const metadata: Metadata = { title: "Join household" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const { supabase, email } = await requireUser();
  const [{ data }, current, name] = await Promise.all([
    supabase.rpc("get_invite", { p_token: token }),
    getMyHousehold(),
    getMyProfileName(),
  ]);
  const invite = data?.[0];

  let problem: string | null = null;
  if (!invite) problem = "This invite link isn't valid. Ask for a new one.";
  else if (invite.accepted_at) problem = "This invite has already been used.";
  else if (new Date(invite.expires_at) <= new Date()) problem = "This invite has expired. Ask for a new one.";
  else if (invite.email !== email)
    problem = `This invite is for ${invite.email}, but you're signed in as ${email}. Sign out, then sign in with ${invite.email}.`;

  if (invite && current?.id === invite.household_id) {
    return (
      <Card className="space-y-3 text-center">
        <h1 className="text-xl font-bold text-stone-900">You&apos;re already in {invite.household_name}</h1>
        <Link href="/" className="inline-block font-semibold text-orange-700">
          Open the recipe book →
        </Link>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Invite</p>
      {invite && (
        <h1 className="text-2xl font-bold text-stone-900">
          {invite.invited_by_name} invited you to <span className="text-orange-700">{invite.household_name}</span>
        </h1>
      )}
      {problem ? (
        <>
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{problem}</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm font-semibold text-orange-700">
              Sign out
            </button>
          </form>
        </>
      ) : (
        <AcceptInviteForm token={token} defaultName={name} currentHouseholdName={current?.name ?? null} />
      )}
    </Card>
  );
}
