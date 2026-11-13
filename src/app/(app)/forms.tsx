"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { ErrorText, Field } from "@/components/ui";
import { ShareInvite } from "@/components/share-invite";
import { acceptInvite, createHousehold, createInvite, leaveHousehold, updateName, type FormState } from "./actions";

export function CreateHouseholdForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(createHousehold, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <Field label="Your name" name="your_name" defaultValue={defaultName} placeholder="Sree" autoComplete="given-name" maxLength={80} />
      <Field label="Household name" name="household_name" placeholder="Our kitchen" required maxLength={80} />
      <ErrorText message={state.error} />
      <SubmitButton pendingText="Creating…">Create household</SubmitButton>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(createInvite, {} as FormState);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <Field label="Their email" name="email" type="email" placeholder="partner@example.com" inputMode="email" required />
        <ErrorText message={state.error} />
        <SubmitButton pendingText="Creating invite…">Create invite</SubmitButton>
      </form>
      {state.inviteToken && state.inviteEmail && (
        <ShareInvite token={state.inviteToken} email={state.inviteEmail} highlight />
      )}
    </div>
  );
}

export function AcceptInviteForm({
  token,
  defaultName,
  currentHouseholdName,
}: {
  token: string;
  defaultName: string;
  currentHouseholdName: string | null;
}) {
  const [state, action] = useActionState(acceptInvite, {} as FormState);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {currentHouseholdName && <input type="hidden" name="leave_current" value="yes" />}
      <Field label="Your name" name="your_name" defaultValue={defaultName} placeholder="Your first name" autoComplete="given-name" maxLength={80} />
      {currentHouseholdName && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Joining will remove you from <strong>{currentHouseholdName}</strong>.
        </p>
      )}
      <ErrorText message={state.error} />
      <SubmitButton pendingText="Joining…">Join household</SubmitButton>
    </form>
  );
}

export function LeaveHouseholdForm({ lastMember }: { lastMember: boolean }) {
  const warning = lastMember
    ? "You're the only member. Leaving deletes this household and its recipes. Continue?"
    : "Leave this household? You'll lose access to its recipes until someone invites you again.";
  return (
    <form action={leaveHousehold} onSubmit={(e) => !window.confirm(warning) && e.preventDefault()}>
      <SubmitButton variant="danger" pendingText="Leaving…">Leave household</SubmitButton>
    </form>
  );
}

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(updateName, {} as FormState);
  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1">
        <Field label="Your name" name="your_name" defaultValue={defaultName} maxLength={80} autoComplete="given-name" />
      </div>
      <div className="w-24">
        <SubmitButton variant="secondary" pendingText="…">Save</SubmitButton>
      </div>
      <ErrorText message={state.error} />
    </form>
  );
}
