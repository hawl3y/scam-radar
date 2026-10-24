"use client";

import { useActionState } from "react";
import { setReportStatus, type AdminActionState } from "./actions";

type Action = { status: "removed" | "active"; label: string; primary?: boolean };

export function AdminReportActions({ reportId, actions }: { reportId: string; actions: Action[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((a) => (
        <ActionButton key={a.status} reportId={reportId} action={a} />
      ))}
    </div>
  );
}

function ActionButton({ reportId, action }: { reportId: string; action: Action }) {
  const [state, run, pending] = useActionState<AdminActionState>(
    setReportStatus.bind(null, reportId, action.status),
    {},
  );
  return (
    <form action={run}>
      <button
        type="submit"
        disabled={pending}
        className={`inline-flex min-h-12 items-center rounded-md px-4 font-bold disabled:opacity-60 ${
          action.primary ? "bg-danger text-background" : "border-2 border-border"
        }`}
      >
        {pending ? "Saving…" : action.label}
      </button>
      {state.error && <span className="ml-2 text-danger">{state.error}</span>}
    </form>
  );
}
