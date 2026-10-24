import Link from "next/link";
import { Suspense } from "react";
import { FeedList } from "@/components/feed-list";
import { ZipForm } from "@/components/zip-form";
import { getNearbyClusters } from "@/lib/clusters";
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
  const { zip, deleted } = await searchParams;
  const viewer = await getViewer(zip);
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
      </div>
    );
  }

  const clusters = await getNearbyClusters(viewer.zip, viewer.radiusMiles);
  const query = viewer.signedIn ? "" : `?zip=${viewer.zip}`;

  return (
    <div className="space-y-4">
      <p className="text-muted">
        Within {viewer.radiusMiles} miles of {viewer.zip} ·{" "}
        <Link href={viewer.signedIn ? "/settings" : "/"} className="underline">
          Change
        </Link>
      </p>
      {clusters.length === 0 ? (
        <p className="rounded-md border-2 border-border p-4">
          No scams reported near you yet. If you get a suspicious message, call, or visit, report it to warn your
          neighbors.
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
    </div>
  );
}
