import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCluster, getClusterExamples, getMyClusterStatus, getMyExampleState } from "@/lib/clusters";
import { crowdLabel } from "@/lib/crowd";
import { formatDistance, formatTimeAgo } from "@/lib/format";
import { defang } from "@/lib/redaction";
import { CHANNELS, SCAM_TYPES } from "@/lib/scam-types";
import { getViewer } from "@/lib/viewer";
import { CorroborateButton } from "./corroborate-button";
import { ExampleActions } from "./example-actions";

export const metadata: Metadata = { title: "Scam alert" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AlertPage({ params, searchParams }: PageProps<"/alerts/[id]">) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <AlertCard params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AlertCard({ params, searchParams }: PageProps<"/alerts/[id]">) {
  const [{ id }, { zip, posted }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();

  const viewer = await getViewer(zip);
  const viewerZip = viewer.kind === "located" ? viewer.zip : null;
  const [cluster, examples, status, exampleState] = await Promise.all([
    getCluster(id, viewerZip),
    getClusterExamples(id),
    getMyClusterStatus(id),
    getMyExampleState(id),
  ]);
  if (!cluster) notFound();

  const type = SCAM_TYPES[cluster.scam_type];
  const distance = formatDistance(cluster.distance_miles, viewerZip !== null && viewerZip === cluster.nearest_zip);
  const meta = [distance, `last reported ${formatTimeAgo(new Date(cluster.last_seen))}`].filter(Boolean).join(" · ");

  return (
    <article className="space-y-6">
      {posted && (
        <p role="status" className="rounded-md border-2 border-accent p-4 font-bold">
          Thanks. Your report is posted and neighbors nearby can see it.
        </p>
      )}

      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{type.label}</h1>
        <p className="text-lg font-bold">{crowdLabel(cluster.report_count, cluster.corroboration_count)}</p>
        <p className="text-muted">{meta}</p>
      </header>

      <CorroborateButton clusterId={cluster.cluster_id} status={status} />

      <section className="space-y-3">
        <h2 className="text-xl font-bold">What it looked like</h2>
        <ul className="space-y-3">
          {examples.map((example) => (
            <li key={example.id} className="space-y-2">
              <p className="text-muted">
                {CHANNELS[example.channel]} · {formatTimeAgo(new Date(example.created_at))}
              </p>
              <blockquote className="whitespace-pre-wrap break-words rounded-md border-l-4 border-border bg-foreground/5 p-4">
                {defang(example.description_redacted)}
              </blockquote>
              <ExampleActions reportId={example.id} state={exampleState.get(example.id)} />
            </li>
          ))}
        </ul>
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

      <Link
        href={viewer.kind === "located" && !viewer.signedIn ? `/?zip=${viewer.zip}` : "/"}
        className="inline-flex min-h-12 items-center underline"
      >
        Back to scams near you
      </Link>
    </article>
  );
}
