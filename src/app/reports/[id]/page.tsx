import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReportMeta } from "@/components/report-card";
import { defang } from "@/lib/redaction";
import { getReport, getViewer } from "@/lib/reports";
import { SCAM_TYPES } from "@/lib/scam-types";

export const metadata: Metadata = { title: "Scam alert" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ReportPage({ params, searchParams }: PageProps<"/reports/[id]">) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AlertCard params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AlertCard({ params, searchParams }: PageProps<"/reports/[id]">) {
  const [{ id }, { zip, posted }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();

  const viewer = await getViewer(zip);
  const viewerZip = viewer.kind === "located" ? viewer.zip : null;
  const report = await getReport(id, viewerZip);
  if (!report) notFound();

  const type = SCAM_TYPES[report.scam_type];
  return (
    <article className="space-y-6">
      {posted && (
        <p role="status" className="rounded-md border-2 border-accent p-4 font-bold">
          Thanks. Your report is posted and neighbors nearby can see it.
        </p>
      )}

      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{type.label}</h1>
        <ReportMeta report={report} viewerZip={viewerZip} />
        <p>Reported by 1 neighbor</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">What it looked like</h2>
        <blockquote className="whitespace-pre-wrap break-words rounded-md border-l-4 border-border bg-foreground/5 p-4">
          {defang(report.description_redacted)}
        </blockquote>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">What to do</h2>
        <ul className="list-disc space-y-1 pl-6">
          {type.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <p>
          If you lost money or shared personal details, call your bank right away and report it at{" "}
          <a href="https://reportfraud.ftc.gov" className="underline" rel="noopener noreferrer">
            ReportFraud.ftc.gov
          </a>
          .
        </p>
      </section>

      <Link href={viewer.kind === "located" && !viewer.signedIn ? `/?zip=${viewer.zip}` : "/"} className="inline-flex min-h-12 items-center underline">
        Back to scams near you
      </Link>
    </article>
  );
}
