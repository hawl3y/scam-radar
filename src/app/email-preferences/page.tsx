import type { Metadata } from "next";
import { Suspense } from "react";
import { getAlertMode } from "@/lib/alerts/preferences";
import { verifyPrefsToken } from "@/lib/alerts/tokens";
import { PrefsForm } from "./prefs-form";

export const metadata: Metadata = { title: "Email preferences", robots: { index: false } };

// Reached from links in alert emails. Works without signing in.
export default function EmailPreferencesPage({ searchParams }: PageProps<"/email-preferences">) {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Email preferences</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Prefs searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Prefs({ searchParams }: Pick<PageProps<"/email-preferences">, "searchParams">) {
  const { token } = await searchParams;
  const tokenValue = typeof token === "string" ? token : "";
  const userId = verifyPrefsToken(tokenValue);
  const current = userId ? await getAlertMode(userId) : null;

  if (!userId || !current) {
    return <p>This link isn&apos;t valid. Use the link at the bottom of your most recent alert email.</p>;
  }
  return <PrefsForm token={tokenValue} current={current} />;
}
