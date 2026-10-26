import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { FeedList } from "@/components/feed-list";
import { RememberZip } from "@/components/local-report-data";
import { RecordUsage } from "@/components/record-usage";
import { TrendingSection } from "@/components/trending-section";
import { ZipForm } from "@/components/zip-form";
import { getNearbyClusters } from "@/lib/clusters";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { getViewer } from "@/lib/viewer";

const HOME_TITLE = `${SITE_NAME}: ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_TITLE,
  openGraph: { title: HOME_TITLE, description: HOME_TITLE, type: "website" },
  twitter: { card: "summary", title: HOME_TITLE, description: HOME_TITLE },
};

// Mobile: compact buttons (still at least 44px tall); desktop: larger.
const HERO_BUTTON =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-md px-1.5 text-center text-sm font-bold sm:min-h-12 sm:px-5 sm:text-lg lg:px-3 lg:text-base";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <section className="space-y-8 sm:space-y-10">
      <Suspense>
        <DeletedNotice searchParams={searchParams} />
      </Suspense>

      <div className="grid gap-5 rounded-2xl bg-tint p-4 sm:p-8 lg:grid-cols-2 lg:items-center lg:gap-12 lg:p-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{SITE_TAGLINE}</h1>
          <Suspense fallback={<p className="text-muted sm:text-lg">{SITE_DESCRIPTION}</p>}>
            <HeroText searchParams={searchParams} />
          </Suspense>
        </div>
        <div className="space-y-3">
          <Suspense>
            <HeroZip searchParams={searchParams} />
          </Suspense>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Link href="/check" className={`${HERO_BUTTON} border-2 border-accent bg-surface`}>
              Check a message
            </Link>
            <Link href="/report" className={`${HERO_BUTTON} bg-accent text-accent-foreground`}>
              Report a scam
            </Link>
          </div>
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
    <p role="status" className="rounded-md border-2 border-accent bg-surface p-4 font-bold">
      Your account and everything tied to it were deleted.
    </p>
  );
}

async function HeroText({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { zip } = await searchParams;
  const viewer = await getViewer(zip);

  if (viewer.kind === "located") {
    return (
      <p className="text-muted sm:text-lg">
        {!viewer.signedIn && <RememberZip zip={viewer.zip} />}
        Within {viewer.radiusMiles} miles of {viewer.zip} ·{" "}
        <Link href={viewer.signedIn ? "/settings" : "/"} className="-my-3 inline-block py-3 underline">
          Change
        </Link>
      </p>
    );
  }
  if (viewer.signedIn) {
    return (
      <p className="sm:text-lg">
        <Link href="/settings?welcome=1" className="underline">
          Add your zip code
        </Link>{" "}
        to see scams reported near you.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-muted sm:text-lg">{SITE_DESCRIPTION}</p>
      {viewer.unknownZip && (
        <p role="alert" className="text-danger">
          We don&apos;t recognize that zip code. Please check it and try again.
        </p>
      )}
    </div>
  );
}

async function HeroZip({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { zip } = await searchParams;
  const viewer = await getViewer(zip);
  if (viewer.kind !== "needs-zip" || viewer.signedIn) return null;
  return <ZipForm defaultValue={viewer.unknownZip} />;
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

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-5",
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
      <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="space-y-1.5 rounded-2xl bg-surface p-3 sm:p-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-tint text-accent">
                {step.icon}
              </span>
              <h3 className="text-lg font-bold leading-tight">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
            </div>
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
