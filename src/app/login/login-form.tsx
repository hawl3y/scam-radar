"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const inputClass =
  "block w-full min-h-12 rounded-md border-2 border-border bg-background px-3 text-lg";
const buttonClass =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground disabled:opacity-60";

const initialState: LoginState = { step: "email" };

// Supabase's default emails have a link but no code. Turn this on in Phase 3,
// when custom SMTP lets us use supabase/templates/sign-in.html ({{ .Token }}).
const SIGN_IN_CODE_ENABLED = false;

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, initialState);

  if (state.step === "email") {
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-2">
          <span className="block font-bold">Email address</span>
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
        </label>
        {state.error && (
          <p role="alert" className="text-danger">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Sending…" : "Email me a sign-in link"}
        </button>
        <p className="text-muted">
          No password needed. We&apos;ll email you a sign-in link
          {SIGN_IN_CODE_ENABLED && " and a code"}.
        </p>
      </form>
    );
  }

  if (!SIGN_IN_CODE_ENABLED) {
    return (
      <form action={action} className="space-y-4">
        <p role="status" className="text-lg">
          We sent an email to <strong>{state.email}</strong>. Open the link in it on this device,
          in this same browser.
        </p>
        <button type="submit" name="intent" value="restart" disabled={pending} className="min-h-12 underline">
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p role="status" className="text-lg">
        We sent an email to <strong>{state.email}</strong>. Tap the link in it, or enter the code
        below.
      </p>
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-2">
        <span className="block font-bold">Code from the email</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`${inputClass} tracking-widest`}
        />
      </label>
      {state.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" name="intent" value="code" disabled={pending} className={buttonClass}>
          {pending ? "Checking…" : "Sign in"}
        </button>
        <button type="submit" name="intent" value="restart" disabled={pending} className="min-h-12 underline">
          Use a different email
        </button>
      </div>
    </form>
  );
}
