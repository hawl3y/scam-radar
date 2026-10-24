import Link from "next/link";
import { chooseScope, scopeLabels, TREND_DATA_NOTE } from "@/lib/trending/scope";
import { getHeadlines, getMarketForZip, getStateTrendSummary, getTrendSummary, getZipState } from "@/lib/trending/read";

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value));

/** FTC unwanted-call trends for the viewer's state (or market), plus FBI headlines. */
export async function TrendingSection({ zip }: { zip: string }) {
  const [state, market, headlines] = await Promise.all([getZipState(zip), getMarketForZip(zip), getHeadlines(3)]);
  const [marketSummary, stateSummary] = await Promise.all([
    market ? getTrendSummary(market.id) : Promise.resolve(null),
    state ? getStateTrendSummary(state) : Promise.resolve(null),
  ]);
  const scope = chooseScope({ state, market, marketSummary, stateSummary });
  const labels = scope.kind === "none" ? null : scopeLabels(scope);

  return (
    <section className="space-y-6" aria-labelledby="trending-heading">
      {scope.kind !== "none" && labels ? (
        <div className="space-y-3">
          <h2 id="trending-heading" className="text-2xl font-bold">
            {labels.heading}
          </h2>
          <p className="text-muted">{labels.intro}</p>
          <ul className="space-y-3">
            {scope.summary.trends.map((trend) => (
              <li key={trend.label} className="rounded-md border-2 border-border p-4">
                <p className="text-lg font-bold">{trend.label}</p>
                <p>
                  {trend.thisWeek} {trend.thisWeek === 1 ? "report" : "reports"}
                  {trend.change ? `, ${trend.change}` : ""}
                </p>
                <p className="text-muted">{trend.tip}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">{TREND_DATA_NOTE}</p>
          <p className="text-sm text-muted">
            Source: U.S. Federal Trade Commission, www.ftc.gov (Do Not Call complaints). Not affiliated with or endorsed
            by the FTC.
          </p>
        </div>
      ) : (
        <p id="trending-heading" className="text-muted">
          No local trend data for your area yet.
        </p>
      )}

      {headlines.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">From the FBI</h2>
          <ul className="space-y-2">
            {headlines.map((h) => (
              <li key={h.url}>
                <a href={h.url} className="underline" rel="noopener noreferrer">
                  {h.title}
                </a>{" "}
                <span className="text-muted">· {shortDate(h.published_at)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            Source: FBI Internet Crime Complaint Center (ic3.gov). Not affiliated with or endorsed by the FBI. These are
            national warnings, not specific to your area.
          </p>
        </div>
      )}

      <p>
        <Link href="/next-steps" className="underline">
          If you&apos;ve been scammed, here&apos;s what to do first
        </Link>
      </p>
    </section>
  );
}
