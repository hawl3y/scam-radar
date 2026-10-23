"use client";

import { useActionState } from "react";
import { RADIUS_OPTIONS } from "@/lib/profile-schema";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm({ homeZip, radiusMiles }: { homeZip: string; radiusMiles: number }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});

  return (
    <form action={action} className="space-y-6">
      <label className="block space-y-2">
        <span className="block font-bold">Your zip code</span>
        <span className="block text-muted">Used to show reports near you. We never store your address.</span>
        <input
          name="homeZip"
          defaultValue={homeZip}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          required
          aria-invalid={Boolean(state.errors?.homeZip)}
          className="block w-40 min-h-12 rounded-md border-2 border-border bg-background px-3 text-lg"
        />
        {state.errors?.homeZip && <span className="block text-danger">{state.errors.homeZip[0]}</span>}
      </label>

      <fieldset className="space-y-2">
        <legend className="font-bold">Show and alert me about scams within</legend>
        <div className="flex flex-wrap gap-3">
          {RADIUS_OPTIONS.map((miles) => (
            <label
              key={miles}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-md border-2 border-border px-4 has-checked:border-accent has-checked:font-bold"
            >
              <input type="radio" name="radiusMiles" value={miles} defaultChecked={miles === radiusMiles} className="size-5" />
              {miles} miles
            </label>
          ))}
        </div>
        {state.errors?.radiusMiles && <p className="text-danger">{state.errors.radiusMiles[0]}</p>}
      </fieldset>

      {state.errors?.form && (
        <p role="alert" className="text-danger">
          {state.errors.form[0]}
        </p>
      )}
      {state.ok && (
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
