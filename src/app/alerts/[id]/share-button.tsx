"use client";

import { useState } from "react";
import { recordClientUsage } from "@/app/usage-actions";

/** Share sheet where supported, otherwise copy the link. The link never includes the viewer's zip. */
export function ShareButton({ clusterId, title }: { clusterId: string; title: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function share() {
    const url = `${window.location.origin}/alerts/${clusterId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Scam alert near us: ${title}`, url });
        setStatus(null);
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied. Paste it in a text or email to family.");
      }
      void recordClientUsage("share");
    } catch (e) {
      // Closing the share sheet isn't an error worth showing.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setStatus(`Copy this link: ${url}`);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-12 items-center rounded-md border-2 border-accent px-5 text-lg font-bold"
      >
        Share with family
      </button>
      {status && (
        <p role="status" className="break-words text-muted">
          {status}
        </p>
      )}
    </div>
  );
}
