import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { FeedList } from "@/components/feed-list";
import { RecordUsage } from "@/components/record-usage";
import { TrendingSection } from "@/components/trending-section";
import { ZipForm } from "@/components/zip-form";
import { getNearbyClusters } from "@/lib/clusters";
import { SITE_DESCRIPTION } from "@/lib/site";
import { getViewer } from "@/lib/viewer";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <section className="space-y-10">
      <Suspense>
        <DeletedNotice searchParams={searchParams} />
      </Suspense>

      <div className="space-y-5 rounded-2xl bg-tint p-6 sm:p-8">
        <h1 className="text-3xl font-bold">Scams near you</h1>
        <Suspense fallback={<p className="text-lg text-muted">{SITE_DESCRIPTION}</p>}>
          <HeroLocation searchParams={searchParams} />
        </Suspense>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/check"
            className="inline-flex min-h-12 items-center rounded-md border-2 border-accent bg-surface px-5 text-lg font-bold"
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

async function DeletedNotice({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { deleted } = await searchParams;
  if (!deleted) return null;
  return (
    <p role="status" className="rounded-md border-2 border-accent p-4 font-bold">
      Your account and everything tied to it were deleted.
    </p>
  );
}

/** Inside the hero: the zip field, or where the feed is centered. */
async function HeroLocation({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { zip } = await searchParams;
  const viewer = await getViewer(zip);

  if (viewer.kind === "located") {
    return (
      <p className="text-lg text-muted">
        Within {viewer.radiusMiles} miles of {viewer.zip} ·{" "}
        <Link href={viewer.signedIn ? "/settings" : "/"} className="underline">
          Change
        </Link>
      </p>
    );
  }
  if (viewer.signedIn) {
    return (
      <p className="text-lg">
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
    </div>
  );
}

async function Feed({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { zip, src } = await searchParams;
  const viewer = await getViewer(zip);
  const usage = <RecordUsage metrics={src === "digest" ? ["feed_view", "email_visit_digest"] : ["feed_view"]} />;

  if (viewer.kind === "needs-zip") {
    if (viewer.signedIn) return usage;
    return (
      <div className="space-y-10">
        {usage}
        <p>
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to save your zip code, report scams, and get alerts.
        </p>
        <HowItWorks />
      </div>
    );
  }

  const clusters = await getNearbyClusters(viewer.zip, viewer.radiusMiles);
  const query = viewer.signedIn ? "" : `?zip=${viewer.zip}`;

  return (
    <div className="space-y-10">
      {usage}
      {clusters.length === 0 ? (
        <p>
          No neighbors have reported scams near you yet. If you get a suspicious message, call, or visit,{" "}
          <Link href="/report" className="underline">
            report it
          </Link>{" "}
          to warn them.
        </p>
      ) : (
        <div className="space-y-4">
          <FeedList
            clusters={clusters}
            viewerZip={viewer.zip}
            query={query}
            signedIn={viewer.signedIn}
            serverLastVisit={viewer.lastFeedVisit}
          />
        </div>
      )}
      <TrendingSection zip={viewer.zip} />
    </div>
  );
}

// Simple line icons, colored with the accent token.
const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-7",
  "aria-hidden": true,
};

const STEPS: { title: string; body: ReactNode; icon: ReactNode }[] = [
  {
    title: "Neighbors report",
    body: "Scam texts, calls, emails, and visits. Personal details are hidden before anything is posted.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        <path d="M8.5 11h7M8.5 14h4" />
      </svg>
    ),
  },
  {
    title: "Reports are grouped",
    body: "Reports of the same scam are combined, so you can see what's spreading near you and what to do.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </svg>
    ),
  },
  {
    title: "Check a message",
    body: (
      <>
        Got something suspicious?{" "}
        <Link href="/check" className="underline">
          Check it
        </Link>{" "}
        to see if neighbors got it too.
      </>
    ),
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.4-4.4" />
      </svg>
    ),
  },
];

function HowItWorks() {
  return (
    <section className="space-y-5" aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="text-2xl font-bold">
        How it works
      </h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="space-y-3 rounded-2xl bg-canvas p-5">
            <span className="inline-flex size-12 items-center justify-center rounded-md bg-tint text-accent">
              {step.icon}
            </span>
            <h3 className="text-lg font-bold">
              <span className="sr-only">Step {i + 1}: </span>
              {step.title}
            </h3>
            <p className="text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="text-muted">
        Free, with no passwords. We never sell your information (see our{" "}
        <Link href="/privacy" className="underline">
          privacy policy
        </Link>
        ). Not affiliated with the BBB, the FTC, or the police.
      </p>
    </section>
  );
}
