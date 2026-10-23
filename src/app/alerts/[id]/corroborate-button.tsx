"use client";

import Link from "next/link";
import { useActionState } from "react";
import { corroborate, type CorroborateState } from "./actions";

type Props = {
  clusterId: string;
  status: { reported: boolean; corroborated: boolean } | null;
};

export function CorroborateButton({ clusterId, status }: Props) {
  const [state, action, pending] = useActionState<CorroborateState>(corroborate.bind(null, clusterId), {});

  if (!status) {
    return (
      <p>
        <Link href={`/login?next=/alerts/${clusterId}`} className="underline">
          Sign in
        </Link>{" "}
        to say you got this too.
      </p>
    );
  }
  if (status.reported) return <p className="font-bold">You reported this.</p>;
  if (status.corroborated) return <p className="font-bold">✓ You said you got this too.</p>;

  return (
    <form action={action} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : "I got this too"}
      </button>
      {state.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
