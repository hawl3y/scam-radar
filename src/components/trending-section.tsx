import Link from "next/link";
import { SCAM_TYPES } from "@/lib/scam-types";
import { getHeadlines, getMarketForZip, getTrendSummary } from "@/lib/trending/read";

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(value.length === 10 ? `${value}T12:00:00Z` : value),
  );

/** Public data for the viewer's area: FTC call complaints (test markets) and FBI headlines. */
export async function TrendingSection({ zip }: { zip: string }) {
  const market = await getMarketForZip(zip);
  const [summary, headlines] = await Promise.all([
    market ? getTrendSummary(market.id) : Promise.resolve(null),
    getHeadlines(3),
  ]);
  if (!summary?.trends.length && headlines.length === 0) return null;

  const areaCodes = market?.area_codes.join(", ");
  return (
    <section className="space-y-6" aria-labelledby="trending-heading">
      {market && summary && summary.trends.length > 0 && (
        <div className="space-y-3">
          <h2 id="trending-heading" className="text-2xl font-bold">
            Trending near you
          </h2>
          <p className="text-muted">
            Unwanted calls reported to the FTC from the {areaCodes} area code
            {market.area_codes.length > 1 ? "s" : ""} in the 7 days to {shortDate(summary.weekEnding)}:{" "}
            {summary.totalThisWeek}. The most common:
          </p>
          <ul className="space-y-3">
            {summary.trends.map((trend) => (
              <li key={trend.label} className="rounded-md border-2 border-border p-4">
                <p className="text-lg font-bold">{trend.label}</p>
                <p>
                  {trend.thisWeek} {trend.thisWeek === 1 ? "report" : "reports"}
                  {trend.change ? `, ${trend.change}` : ""}
                </p>
                <p className="text-muted">{SCAM_TYPES[trend.scamType].tips[0]}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            Source: U.S. Federal Trade Commission, www.ftc.gov (Do Not Call complaints). Complaints are not verified.
            Not affiliated with or endorsed by the FTC.
          </p>
        </div>
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
            Source: FBI Internet Crime Complaint Center (ic3.gov). Not affiliated with or endorsed by the FBI.
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
