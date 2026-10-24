"use client";

import { useActionState, useState } from "react";
import { AlertModeOptions } from "@/components/alert-mode-options";
import type { AlertMode } from "@/lib/alerts/preferences";
import { RADIUS_OPTIONS } from "@/lib/profile-schema";
import { saveSettings, type SettingsState } from "./actions";

type Props = { homeZip: string; radiusMiles: number; alertMode: AlertMode; welcome: boolean };

export function SettingsForm({ homeZip, radiusMiles, alertMode, welcome }: Props) {
  // Controlled inputs: React resets uncontrolled forms after an action, which
  // would put back the values the page first loaded with.
  const [zip, setZip] = useState(homeZip);
  const [radius, setRadius] = useState(radiusMiles);
  const [mode, setMode] = useState<AlertMode>(alertMode);
  const [showWelcome, setShowWelcome] = useState(welcome);

  const [state, action, pending] = useActionState<SettingsState, FormData>(async (prev, formData) => {
    const result = await saveSettings(prev, formData);
    if (result.ok) {
      setShowWelcome(false);
      window.history.replaceState(null, "", "/settings");
    }
    return result;
  }, {});

  return (
    <form action={action} className="space-y-6">
      {showWelcome && (
        <p className="rounded-md border-2 border-accent p-4">
          Welcome! Tell us roughly where you are so we can show scams reported near you.
        </p>
      )}
      <label className="block space-y-2">
        <span className="block font-bold">Your zip code</span>
        <span className="block text-muted">Used to show reports near you. We never store your address.</span>
        <input
          name="homeZip"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
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
              <input
                type="radio"
                name="radiusMiles"
                value={miles}
                checked={miles === radius}
                onChange={() => setRadius(miles)}
                className="size-5"
              />
              {miles} miles
            </label>
          ))}
        </div>
        {state.errors?.radiusMiles && <p className="text-danger">{state.errors.radiusMiles[0]}</p>}
      </fieldset>

      <AlertModeOptions value={mode} onChange={setMode} />
      {state.errors?.alertMode && <p className="text-danger">{state.errors.alertMode[0]}</p>}

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
