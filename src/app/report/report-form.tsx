"use client";

import { useActionState } from "react";
import { defang, type RedactionKind } from "@/lib/redaction";
import { DESCRIPTION_MAX } from "@/lib/report-schema";
import { CHANNELS, SCAM_TYPES, type Channel, type ScamType } from "@/lib/scam-types";
import { reportAction, type ReportState } from "./actions";

const KIND_LABELS: Record<RedactionKind, [string, string]> = {
  phone: ["phone number", "phone numbers"],
  email: ["email address", "email addresses"],
  card: ["card number", "card numbers"],
  account: ["account number", "account numbers"],
  ssn: ["Social Security number", "Social Security numbers"],
  code: ["code", "codes"],
  address: ["address", "addresses"],
  name: ["name", "names"],
};

function foundSummary(found: Partial<Record<RedactionKind, number>>) {
  const parts = (Object.entries(found) as [RedactionKind, number][]).map(
    ([kind, n]) => `${n} ${KIND_LABELS[kind][n === 1 ? 0 : 1]}`,
  );
  return parts.length ? `We hid ${parts.join(", ")}.` : "We didn't find any personal details to hide.";
}

const inputClass = "block w-full min-h-12 rounded-md border-2 border-border bg-background px-3 text-lg";
const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground disabled:opacity-60";

function FieldError({ messages }: { messages?: string[] }) {
  return messages?.length ? <span className="block text-danger">{messages[0]}</span> : null;
}

export function ReportForm({ defaultZip }: { defaultZip: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportAction, {
    step: "draft",
    version: 0,
  });

  if (state.step === "preview") {
    const { draft, found, notice, errors } = state;
    return (
      <form key={state.version} action={action} className="space-y-6">
        <input type="hidden" name="channel" value={draft.channel} />
        <input type="hidden" name="scamType" value={draft.scamType} />
        <input type="hidden" name="zip" value={draft.zip} />

        <h2 className="text-2xl font-bold">Check before posting</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="font-bold">How</dt>
          <dd>{CHANNELS[draft.channel]}</dd>
          <dt className="font-bold">Kind</dt>
          <dd>{SCAM_TYPES[draft.scamType].label}</dd>
          <dt className="font-bold">Where</dt>
          <dd>Near {draft.zip}</dd>
        </dl>

        {notice && (
          <p role="alert" className="rounded-md border-2 border-accent p-4 font-bold">
            {notice}
          </p>
        )}
        <p role="status">{foundSummary(found)}</p>

        <label className="block space-y-2">
          <span className="block font-bold">This is what neighbors will see</span>
          <span className="block text-muted">
            Edit anything that could identify you or someone else, like a name, address, or account number.
          </span>
          <textarea
            name="description"
            defaultValue={draft.description}
            rows={8}
            maxLength={DESCRIPTION_MAX}
            className={`${inputClass} py-2`}
          />
          <FieldError messages={errors?.description} />
        </label>
        {defang(draft.description) !== draft.description && (
          <p className="text-muted">Links will be shown like example[.]com and won&apos;t be clickable.</p>
        )}

        <FieldError messages={errors?.form} />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" name="intent" value="post" disabled={pending} className={primaryButton}>
            {pending ? "Posting…" : "Post report"}
          </button>
          <button type="submit" name="intent" value="back" disabled={pending} className="min-h-12 underline">
            Go back
          </button>
        </div>
      </form>
    );
  }

  const { values, errors } = state;
  return (
    <form key={state.version} action={action} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="font-bold">How did they contact you?</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.entries(CHANNELS) as [Channel, string][]).map(([key, label]) => (
            <label
              key={key}
              className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-md border-2 border-border px-3 has-checked:border-accent has-checked:font-bold"
            >
              <input type="radio" name="channel" value={key} defaultChecked={values?.channel === key} className="size-5" />
              {label}
            </label>
          ))}
        </div>
        <FieldError messages={errors?.channel} />
      </fieldset>

      <label className="block space-y-2">
        <span className="block font-bold">What kind of scam?</span>
        <select name="scamType" defaultValue={values?.scamType ?? ""} className={inputClass}>
          <option value="" disabled>
            Choose one
          </option>
          {(Object.entries(SCAM_TYPES) as [ScamType, { label: string }][]).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <FieldError messages={errors?.scamType} />
      </label>

      <label className="block space-y-2">
        <span className="block font-bold">What happened?</span>
        <span className="block text-muted">
          Paste the message or describe the call or visit. Next, you&apos;ll see a preview with phone numbers, emails,
          names, and other personal details hidden.
        </span>
        <textarea
          name="description"
          defaultValue={values?.description ?? ""}
          rows={6}
          maxLength={DESCRIPTION_MAX}
          className={`${inputClass} py-2`}
        />
        <FieldError messages={errors?.description} />
      </label>

      <label className="block space-y-2">
        <span className="block font-bold">Zip code where it happened</span>
        <input
          name="zip"
          defaultValue={values?.zip ?? defaultZip}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          className={`${inputClass} w-40`}
        />
        <FieldError messages={errors?.zip} />
      </label>

      <FieldError messages={errors?.form} />
      <button type="submit" name="intent" value="preview" disabled={pending} className={primaryButton}>
        {pending ? "Checking…" : "Preview"}
      </button>
    </form>
  );
}
