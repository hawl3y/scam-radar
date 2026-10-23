import type { Metadata } from "next";
import { Suspense } from "react";
import { getViewer } from "@/lib/viewer";
import { CheckForm } from "./check-form";

export const metadata: Metadata = { title: "Check a message" };

export default function CheckPage({ searchParams }: PageProps<"/check">) {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Is this a scam?</h1>
      <p>Paste a text or email, or describe a call or visit. We&apos;ll look for similar reports from neighbors.</p>
      <Suspense fallback={<p>Loading…</p>}>
        <Check searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Check({ searchParams }: Pick<PageProps<"/check">, "searchParams">) {
  const { zip } = await searchParams;
  const viewer = await getViewer(zip);
  return (
    <CheckForm defaultZip={viewer.kind === "located" ? viewer.zip : ""} signedIn={viewer.signedIn} />
  );
}
