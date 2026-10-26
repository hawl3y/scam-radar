// Pilot success criteria (brief §8 Phase 6), reviewed at weeks 4–8 to decide
// whether to continue, adjust, or stop.

export type PilotSummary = {
  signups_in_market: number;
  total_signups: number;
  clusters_with_reports: number;
  clusters_corroborated: number;
  users_with_activity: number;
  users_returning: number;
  profiles_total: number;
  profiles_off: number;
};

export type WeeklyMetrics = {
  week_start: string;
  signups: number;
  active_users: number;
  returning_users: number;
  reports: number;
  new_clusters: number;
  corroborations: number;
  checks: number;
  feed_views: number;
  shares: number;
  instant_emails: number;
  digest_emails: number;
  email_visits: number;
  unsubscribes: number;
  flags: number;
  removals: number;
};

/**
 * `value` is the headline number; `progress` is one line for emails (e.g. "4 of 50");
 * `detail` gives the counts behind a percentage.
 */
export type CriterionResult = {
  label: string;
  value: string;
  target: string;
  progress: string;
  detail: string | null;
  met: boolean | null;
};

/** Monday of the pilot's launch week (Phase 6 went live Oct 23, 2026). Earlier weeks are pre-launch testing. */
export const PILOT_LAUNCH_WEEK = "2026-10-19";

export const sinceLaunch = (weeks: WeeklyMetrics[]) => weeks.filter((w) => w.week_start >= PILOT_LAUNCH_WEEK);

/** The weekly numbers, grouped for the summary email and the metrics table. */
export const METRIC_GROUPS: { heading: string; metrics: [keyof Omit<WeeklyMetrics, "week_start">, string][] }[] = [
  { heading: "People", metrics: [["signups", "Sign-ups"], ["active_users", "Active users"], ["returning_users", "Returning"]] },
  {
    heading: "Activity",
    metrics: [
      ["reports", "Reports"],
      ["new_clusters", "New alerts"],
      ["corroborations", "Got this too"],
      ["checks", "Checks"],
      ["feed_views", "Feed views"],
      ["shares", "Shares"],
    ],
  },
  {
    heading: "Email",
    metrics: [
      ["instant_emails", "Instant emails"],
      ["digest_emails", "Digests"],
      ["email_visits", "Visits from email"],
      ["unsubscribes", "Turned off emails"],
    ],
  },
  { heading: "Moderation", metrics: [["flags", "Flags"], ["removals", "Removals"]] },
];

/** "Oct 19" for a week starting 2026-10-19. */
export const weekLabel = (weekStart: string) =>
  new Date(`${weekStart}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** ✓ met, ✗ not met, – not enough data. */
export const criterionMark = (met: boolean | null) => (met === null ? "–" : met ? "✓" : "✗");

export const PILOT_TARGETS = {
  signupsInMarket: 50,
  reportsPerWeek: 5,
  corroborationRate: 0.3,
  returningRate: 0.4,
  unsubscribeRateBelow: 0.1,
} as const;

const pct = (n: number) => `${Math.round(n * 100)}%`;
const ratio = (num: number, den: number) => (den > 0 ? num / den : null);

function rateResult(label: string, num: number, den: number, noun: string, target: string, met: (r: number) => boolean): CriterionResult {
  const r = ratio(num, den);
  const detail = r === null ? null : `${num} of ${den} ${noun}`;
  return {
    label,
    value: r === null ? "—" : pct(r),
    target,
    progress: r === null ? `No data yet · target ${target}` : `${pct(r)} (${detail}) · target ${target}`,
    detail,
    met: r === null ? null : met(r),
  };
}

/** Evaluate the targets. `weeks` is newest first; the first entry is the current, partial week. */
export function evaluatePilot(summary: PilotSummary, weeks: WeeklyMetrics[]): CriterionResult[] {
  const lastFullWeek = weeks[1];
  const { signupsInMarket, reportsPerWeek, corroborationRate, returningRate, unsubscribeRateBelow } = PILOT_TARGETS;

  return [
    {
      label: "Sign-ups in the test area",
      value: String(summary.signups_in_market),
      target: `${signupsInMarket}+`,
      progress: `${summary.signups_in_market} of ${signupsInMarket}`,
      detail: null,
      met: summary.signups_in_market >= signupsInMarket,
    },
    {
      label: "New reports last full week",
      value: lastFullWeek ? String(lastFullWeek.reports) : "—",
      target: `${reportsPerWeek}+ by week 4`,
      progress: lastFullWeek ? `${lastFullWeek.reports} of ${reportsPerWeek}` : "No full week yet",
      detail: null,
      met: lastFullWeek ? lastFullWeek.reports >= reportsPerWeek : null,
    },
    rateResult(
      "Alerts with an “I got this too”",
      summary.clusters_corroborated,
      summary.clusters_with_reports,
      "visible alerts",
      `${pct(corroborationRate)}+`,
      (r) => r >= corroborationRate,
    ),
    rateResult(
      "Users who came back in a later week",
      summary.users_returning,
      summary.users_with_activity,
      "users",
      `${pct(returningRate)}+`,
      (r) => r >= returningRate,
    ),
    rateResult(
      "Turned off emails",
      summary.profiles_off,
      summary.profiles_total,
      "people",
      `under ${pct(unsubscribeRateBelow)}`,
      (r) => r < unsubscribeRateBelow,
    ),
  ];
}
