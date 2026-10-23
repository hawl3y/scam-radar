import Link from "next/link";
import { Suspense } from "react";
import { ReportCard } from "@/components/report-card";
import { ZipForm } from "@/components/zip-form";
import { getNearbyReports, getViewer } from "@/lib/reports";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Scams near you</h1>
        <Link
          href="/report"
          className="inline-flex min-h-12 items-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground"
        >
          Report a scam
        </Link>
      </div>
      <Suspense fallback={<p>Loading reports…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Feed({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { zip } = await searchParams;
  const viewer = await getViewer(zip);

  if (viewer.kind === "needs-zip") {
    if (viewer.signedIn) {
      return (
        <p>
          <Link href="/settings?welcome=1" className="underline">
            Add your zip code
          </Link>{" "}
          to see scams reported near you.
        </p>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-lg text-muted">{SITE_DESCRIPTION}</p>
        {viewer.unknownZip && (
          <p role="alert" className="text-danger">
            We don&apos;t recognize that zip code. Please check it and try again.
          </p>
        )}
        <ZipForm defaultValue={viewer.unknownZip} />
        <p>
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to save your zip code, report scams, and get alerts.
        </p>
      </div>
    );
  }

  const reports = await getNearbyReports(viewer.zip, viewer.radiusMiles);
  const query = viewer.signedIn ? "" : `?zip=${viewer.zip}`;

  return (
    <div className="space-y-4">
      <p className="text-muted">
        Within {viewer.radiusMiles} miles of {viewer.zip} ·{" "}
        <Link href={viewer.signedIn ? "/settings" : "/"} className="underline">
          Change
        </Link>
      </p>
      {reports.length === 0 ? (
        <p className="rounded-md border-2 border-border p-4">
          No scams reported near you yet. If you get a suspicious message, call, or visit, report it to warn your
          neighbors.
        </p>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} viewerZip={viewer.zip} href={`/reports/${report.id}${query}`} />
          ))}
        </ul>
      )}
    </div>
  );
}
