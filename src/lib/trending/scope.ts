import { stateName } from "@/lib/states";
import type { TrendSummary } from "./trends";

// Which FTC trend data to show for a zip, and honest wording for it. The data
// is where the complainant lives (state) and their phone's area code, not
// where the call came from or the viewer's town.

export type TrendScope =
  | { kind: "market"; state: string; areaCodes: string[]; summary: TrendSummary }
  | { kind: "state"; state: string; summary: TrendSummary }
  | { kind: "none" };

const hasData = (s: TrendSummary | null | undefined): s is TrendSummary => Boolean(s && s.trends.length > 0);

export function chooseScope(input: {
  state: string | null;
  market: { state: string; area_codes: string[] } | null;
  marketSummary: TrendSummary | null;
  stateSummary: TrendSummary | null;
}): TrendScope {
  const { state, market, marketSummary, stateSummary } = input;
  if (market && hasData(marketSummary)) {
    return { kind: "market", state: market.state, areaCodes: market.area_codes, summary: marketSummary };
  }
  if (state && hasData(stateSummary)) return { kind: "state", state, summary: stateSummary };
  return { kind: "none" };
}

/** "845" / "201 and 551" / "201, 551, and 862" */
export function joinAreaCodes(codes: string[]): string {
  if (codes.length <= 1) return codes.join("");
  if (codes.length === 2) return `${codes[0]} and ${codes[1]}`;
  return `${codes.slice(0, -1).join(", ")}, and ${codes[codes.length - 1]}`;
}

const shortDate = (day: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

/** Heading, plus a summary that leads with the count: "166" + "calls reported to the FTC in …". */
export function scopeLabels(scope: Exclude<TrendScope, { kind: "none" }>): {
  heading: string;
  count: string;
  summary: string;
} {
  const { summary } = scope;
  const name = stateName(scope.state);
  const period =
    summary.daysThisWeek >= 7
      ? `in the 7 days through ${shortDate(summary.weekEnding)}`
      : `in the ${summary.daysThisWeek} ${summary.daysThisWeek === 1 ? "day" : "days"} of data so far, through ${shortDate(summary.weekEnding)}`;
  const count = summary.totalThisWeek.toLocaleString("en-US");
  const calls = summary.totalThisWeek === 1 ? "call" : "calls";

  if (scope.kind === "market") {
    const codes = joinAreaCodes(scope.areaCodes);
    const plural = scope.areaCodes.length > 1 ? "area codes" : "area code";
    return {
      heading: `Unwanted calls reported in ${name} (${codes} ${plural})`,
      count,
      summary: `${calls} reported to the FTC ${period}, by people in ${name} with ${codes} numbers.`,
    };
  }
  return {
    heading: `Unwanted calls reported in ${name}`,
    count,
    summary: `${calls} reported to the FTC ${period}, by people in ${name}.`,
  };
}

export const TREND_DATA_NOTE =
  "Based on where the person who complained lives and their phone's area code, not where the caller is. Not specific to your town. Complaints are not verified, and ones that don't list a state aren't included.";
