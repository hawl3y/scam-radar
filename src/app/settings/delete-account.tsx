"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteState } from "./delete-actions";

export function DeleteAccount() {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, {});
  return (
    <details className="rounded-md border-2 border-border p-4">
      <summary className="inline-flex min-h-12 cursor-pointer items-center font-bold">Delete my account</summary>
      <form action={action} className="mt-3 space-y-4">
        <p>
          This permanently deletes your account, your settings, your reports, and your &quot;I got this too&quot;
          answers. It can&apos;t be undone.
        </p>
        <label className="flex min-h-12 cursor-pointer items-center gap-3">
          <input type="checkbox" name="confirm" value="yes" required className="size-5" />
          I understand. Delete everything.
        </label>
        {state.error && (
          <p role="alert" className="text-danger">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center rounded-md bg-danger px-5 text-lg font-bold text-background disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </form>
    </details>
  );
}
