"use client";

import { useActionState } from "react";
import type { ExampleState } from "@/lib/clusters";
import { flagReport, rateReport, type ExampleActionState } from "./actions";

const REASONS = [
  ["personal_info", "Shares someone's personal info"],
  ["private_person", "Names a private person"],
  ["not_a_scam", "Not a scam"],
  ["spam", "Spam or fake"],
  ["other", "Something else"],
] as const;

const smallButton = "inline-flex min-h-12 items-center rounded-md border-2 px-4 font-bold disabled:opacity-60";

type Props = { reportId: string; clusterId: string; state: ExampleState | undefined };

export function ExampleActions({ reportId, clusterId, state }: Props) {
  const [rateState, rateAction, rating] = useActionState<ExampleActionState, FormData>(
    rateReport.bind(null, reportId),
    {},
  );
  const [flagState, flagAction, flagging] = useActionState<ExampleActionState, FormData>(
    flagReport.bind(null, reportId, clusterId),
    {},
  );

  // Signed out, or your own report: nothing to rate or flag.
  if (!state || state.mine) return null;

  return (
    <div className="space-y-3">
      <form action={rateAction} className="flex flex-wrap items-center gap-3">
        <span className="font-bold">Was this helpful?</span>
        {(["yes", "no"] as const).map((value) => {
          const selected = state.my_rating === (value === "yes");
          return (
            <button
              key={value}
              type="submit"
              name="helpful"
              value={value}
              disabled={rating}
              aria-pressed={selected}
              className={`${smallButton} ${selected ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}
            >
              {value === "yes" ? "Helpful" : "Not helpful"}
            </button>
          );
        })}
      </form>
      {(rateState.error || rateState.message) && (
        <p role="status" className={rateState.error ? "text-danger" : "text-muted"}>
          {rateState.error ?? rateState.message}
        </p>
      )}

      {state.my_flagged || flagState.message ? (
        <p role="status" className="text-muted">
          {flagState.message ?? "You reported a problem with this. Thanks."}
        </p>
      ) : (
        <details>
          <summary className="inline-flex min-h-12 cursor-pointer items-center underline">Report a problem</summary>
          <form action={flagAction} className="mt-2 space-y-3 rounded-md border-2 border-border p-4">
            <fieldset className="space-y-2">
              <legend className="font-bold">What&apos;s wrong?</legend>
              {REASONS.map(([value, label]) => (
                <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3">
                  <input type="radio" name="reason" value={value} required className="size-5" />
                  {label}
                </label>
              ))}
            </fieldset>
            <label className="block space-y-2">
              <span className="block font-bold">Anything else? (optional)</span>
              <textarea
                name="details"
                rows={3}
                maxLength={500}
                className="block w-full rounded-md border-2 border-border bg-background px-3 py-2 text-lg"
              />
            </label>
            {flagState.error && (
              <p role="alert" className="text-danger">
                {flagState.error}
              </p>
            )}
            <button
              type="submit"
              disabled={flagging}
              className="inline-flex min-h-12 items-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground disabled:opacity-60"
            >
              {flagging ? "Sending…" : "Send"}
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
