"use client";

import { useActionState } from "react";
import { AlertModeOptions } from "@/components/alert-mode-options";
import type { AlertMode } from "@/lib/alerts/preferences";
import { saveEmailPreference, type PrefsState } from "./actions";

export function PrefsForm({ token, current }: { token: string; current: AlertMode }) {
  const [state, action, pending] = useActionState<PrefsState, FormData>(saveEmailPreference.bind(null, token), {});
  return (
    <form action={action} className="space-y-4">
      <AlertModeOptions value={current} />
      {state.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p role="status" className="font-bold">
          Saved.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
