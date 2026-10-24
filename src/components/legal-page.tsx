import type { ReactNode } from "react";
import { SUPPORT_EMAIL } from "@/lib/site";

export const LEGAL_UPDATED = "October 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="max-w-3xl space-y-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-6 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-1">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted">Last updated {LEGAL_UPDATED}</p>
      </header>
      {children}
      <h2>Contact</h2>
      <p>
        Questions? Email <SupportLink />.
      </p>
    </article>
  );
}

export function SupportLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
      {SUPPORT_EMAIL}
    </a>
  );
}
