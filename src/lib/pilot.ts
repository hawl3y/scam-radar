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

export type CriterionResult = { label: string; value: string; target: string; met: boolean | null };

export const PILOT_TARGETS = {
  signupsInMarket: 50,
  reportsPerWeek: 5,
  corroborationRate: 0.3,
  returningRate: 0.4,
  unsubscribeRateBelow: 0.1,
} as const;

const pct = (n: number) => `${Math.round(n * 100)}%`;
const ratio = (num: number, den: number) => (den > 0 ? num / den : null);

/** Evaluate the targets. `weeks` is newest first; the first entry is the current, partial week. */
export function evaluatePilot(summary: PilotSummary, weeks: WeeklyMetrics[]): CriterionResult[] {
  const lastFullWeek = weeks[1];
  const corroboration = ratio(summary.clusters_corroborated, summary.clusters_with_reports);
  const returning = ratio(summary.users_returning, summary.users_with_activity);
  const unsubscribe = ratio(summary.profiles_off, summary.profiles_total);

  return [
    {
      label: "Sign-ups in the test area",
      value: String(summary.signups_in_market),
      target: `${PILOT_TARGETS.signupsInMarket}+`,
      met: summary.signups_in_market >= PILOT_TARGETS.signupsInMarket,
    },
    {
      label: "New reports last full week",
      value: lastFullWeek ? String(lastFullWeek.reports) : "—",
      target: `${PILOT_TARGETS.reportsPerWeek}+ by week 4`,
      met: lastFullWeek ? lastFullWeek.reports >= PILOT_TARGETS.reportsPerWeek : null,
    },
    {
      label: "Alerts with an “I got this too”",
      value: corroboration === null ? "—" : pct(corroboration),
      target: `${pct(PILOT_TARGETS.corroborationRate)}+`,
      met: corroboration === null ? null : corroboration >= PILOT_TARGETS.corroborationRate,
    },
    {
      label: "Users who came back in a later week",
      value: returning === null ? "—" : pct(returning),
      target: `${pct(PILOT_TARGETS.returningRate)}+`,
      met: returning === null ? null : returning >= PILOT_TARGETS.returningRate,
    },
    {
      label: "Turned off emails",
      value: unsubscribe === null ? "—" : pct(unsubscribe),
      target: `under ${pct(PILOT_TARGETS.unsubscribeRateBelow)}`,
      met: unsubscribe === null ? null : unsubscribe < PILOT_TARGETS.unsubscribeRateBelow,
    },
  ];
}
