"use client";

import { useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ShareInvite({ token, email, highlight = false }: { token: string; email: string; highlight?: boolean }) {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const canShare = useSyncExternalStore(subscribe, () => typeof navigator.share === "function", () => false);
  const [copied, setCopied] = useState(false);
  const link = `${origin}/invite/${token}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    await navigator.share({ title: "Join our Reciplanner household", text: "Join our recipe book:", url: link }).catch(() => {});
  }

  return (
    <div className={`space-y-3 rounded-xl p-4 ${highlight ? "bg-orange-50 ring-1 ring-orange-200" : "bg-stone-50"}`}>
      {highlight && (
        <p className="text-sm text-stone-800">
          Invite ready. Send this link to <strong>{email}</strong>. They sign in with that email to join.
        </p>
      )}
      <p className="break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-stone-700 ring-1 ring-stone-200" data-testid="invite-link">
        {link}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="h-10 flex-1 rounded-lg bg-white text-sm font-semibold text-stone-800 ring-1 ring-stone-300">
          {copied ? "Copied" : "Copy link"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="h-10 flex-1 rounded-lg bg-orange-600 text-sm font-semibold text-white">
            Share…
          </button>
        )}
      </div>
    </div>
  );
}
