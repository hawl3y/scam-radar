"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CodeInput } from "@/components/code-input";
import { login, type LoginState } from "./actions";

const inputClass =
  "block w-full min-h-12 rounded-md border-2 border-border bg-background px-3 text-lg";
const buttonClass =
  "inline-flex min-h-12 items-center justify-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground disabled:opacity-60";


// Requires the custom email template (supabase/templates/sign-in.html), which
// includes {{ .Token }}. Supabase's default emails have a link but no code.
const SIGN_IN_CODE_ENABLED = true;

type Props = {
  next: string;
  /** "code": start by asking for the email and code (e.g. after a sign-in link failed). */
  initialStep?: "email" | "code";
};

export function LoginForm({ next, initialStep = "email" }: Props) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    initialStep === "code" ? { step: "code", email: null } : { step: "email" },
  );

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
        <p className="text-muted">
          By signing in you agree to the{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy policy
          </Link>
          .
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
      {state.email ? (
        <p role="status" className="text-lg">
          We sent an email to <strong>{state.email}</strong>. Tap the link in it, or enter the code below.
        </p>
      ) : (
        <>
          <h2 className="text-xl font-bold">Enter your code instead</h2>
          <p>The sign-in email also has a code. Enter it with the email address it was sent to.</p>
          <label className="block space-y-2">
            <span className="block font-bold">Email address</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={state.enteredEmail}
              className={inputClass}
            />
          </label>
        </>
      )}
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-2">
        <span className="block font-bold">Code from the email</span>
        <CodeInput className={inputClass} submitIntent="code" disabled={pending} autoFocus={!!state.email} />
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
        <button type="submit" name="intent" value="restart" disabled={pending} formNoValidate className="min-h-12 underline">
          {state.email ? "Use a different email" : "Email me a new link instead"}
        </button>
      </div>
    </form>
  );
}
