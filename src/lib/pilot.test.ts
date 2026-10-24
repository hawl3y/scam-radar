import { describe, expect, it } from "vitest";
import { PILOT_TARGETS, evaluatePilot, type PilotSummary, type WeeklyMetrics } from "./pilot";

const week = (reports: number): WeeklyMetrics => ({
  week_start: "2026-10-19", signups: 0, active_users: 0, returning_users: 0, reports, new_clusters: 0,
  corroborations: 0, checks: 0, feed_views: 0, shares: 0, instant_emails: 0, digest_emails: 0,
  email_visits: 0, unsubscribes: 0, flags: 0, removals: 0,
});

const summary: PilotSummary = {
  signups_in_market: 52, total_signups: 60,
  clusters_with_reports: 10, clusters_corroborated: 3,
  users_with_activity: 40, users_returning: 15,
  profiles_total: 60, profiles_off: 6,
};

describe("evaluatePilot", () => {
  it("uses 50 sign-ups as the target", () => {
    expect(PILOT_TARGETS.signupsInMarket).toBe(50);
  });

  it("evaluates each criterion", () => {
    const results = evaluatePilot(summary, [week(2), week(5)]);
    expect(results.map((r) => [r.value, r.met])).toEqual([
      ["52", true],
      ["5", true], // last full week, not the partial current week
      ["30%", true],
      ["38%", false],
      ["10%", false], // must be under 10%
    ]);
  });

  it("reports unknown instead of failing when there's no data yet", () => {
    const empty = { ...summary, clusters_with_reports: 0, users_with_activity: 0, profiles_total: 0 };
    const results = evaluatePilot(empty, [week(0)]);
    expect(results.slice(1).map((r) => r.met)).toEqual([null, null, null, null]);
  });
});
