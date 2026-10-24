import Link from "next/link";
import { Suspense } from "react";
import { FeedList } from "@/components/feed-list";
import { TrendingSection } from "@/components/trending-section";
import { ZipForm } from "@/components/zip-form";
import { getNearbyClusters } from "@/lib/clusters";
import { RecordUsage } from "@/components/record-usage";
import { getViewer } from "@/lib/viewer";
import { SITE_DESCRIPTION } from "@/lib/site";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Scams near you</h1>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/check"
            className="inline-flex min-h-12 items-center rounded-md border-2 border-accent px-5 text-lg font-bold"
          >
            Check a message
          </Link>
          <Link
            href="/report"
            className="inline-flex min-h-12 items-center rounded-md bg-accent px-5 text-lg font-bold text-accent-foreground"
          >
            Report a scam
          </Link>
        </div>
      </div>
      <Suspense fallback={<p>Loading reports…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Feed({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { zip, deleted, src } = await searchParams;
  const viewer = await getViewer(zip);
  const usage = <RecordUsage metrics={src === "digest" ? ["feed_view", "email_visit_digest"] : ["feed_view"]} />;
  const deletedNotice = deleted ? (
    <p role="status" className="rounded-md border-2 border-accent p-4 font-bold">
      Your account and everything tied to it were deleted.
    </p>
  ) : null;

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
        {usage}
        {deletedNotice}
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
        <section className="space-y-3 pt-4" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="text-2xl font-bold">
            How it works
          </h2>
          <ol className="list-decimal space-y-2 pl-6">
            <li>Neighbors report scam texts, calls, emails, and visits. Personal details are hidden before anything is posted.</li>
            <li>Reports of the same scam are grouped, so you can see what&apos;s spreading near you and what to do.</li>
            <li>
              Got something suspicious?{" "}
              <Link href="/check" className="underline">
                Check it
              </Link>{" "}
              to see if neighbors got it too.
            </li>
          </ol>
          <p className="text-muted">
            Free, with no passwords. We never sell your information (see our{" "}
            <Link href="/privacy" className="underline">
              privacy policy
            </Link>
            ). Not affiliated with the BBB, the FTC, or the police.
          </p>
        </section>
      </div>
    );
  }

  const clusters = await getNearbyClusters(viewer.zip, viewer.radiusMiles);
  const query = viewer.signedIn ? "" : `?zip=${viewer.zip}`;

  return (
    <div className="space-y-4">
      {usage}
      <p className="text-muted">
        Within {viewer.radiusMiles} miles of {viewer.zip} ·{" "}
        <Link href={viewer.signedIn ? "/settings" : "/"} className="underline">
          Change
        </Link>
      </p>
      {clusters.length === 0 ? (
        <p>
          No neighbors have reported scams near you yet. If you get a suspicious message, call, or visit,{" "}
          <Link href="/report" className="underline">
            report it
          </Link>{" "}
          to warn them.
        </p>
      ) : (
        <FeedList
          clusters={clusters}
          viewerZip={viewer.zip}
          query={query}
          signedIn={viewer.signedIn}
          serverLastVisit={viewer.lastFeedVisit}
        />
      )}
      <TrendingSection zip={viewer.zip} />
    </div>
  );
}
