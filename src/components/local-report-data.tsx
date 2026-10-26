"use client";

import { useEffect, type ReactNode } from "react";
import { DRAFT_KEY, LAST_ZIP_KEY, clearLocalReportData } from "@/lib/report-draft";

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ClearReportDraft() {
  useEffect(() => {
    store()?.removeItem(DRAFT_KEY);
  }, []);
  return null;
}

/** Remembers the zip a signed-out visitor browses with, to prefill the report form. */
export function RememberZip({ zip }: { zip: string }) {
  useEffect(() => {
    store()?.setItem(LAST_ZIP_KEY, zip);
  }, [zip]);
  return null;
}

/** A form that clears this browser's report data when submitted (sign-out, delete account). */
export function ClearsLocalDataForm(props: React.ComponentProps<"form"> & { children: ReactNode }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        const s = store();
        if (s) clearLocalReportData(s);
        props.onSubmit?.(e);
      }}
    />
  );
}
