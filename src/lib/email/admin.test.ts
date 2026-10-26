import { describe, expect, it } from "vitest";
import type { PilotSummary, WeeklyMetrics } from "@/lib/pilot";
import { flagEmail, renderAdminEmail, weeklySummaryEmail } from "./admin";

const week = (week_start: string, reports: number): WeeklyMetrics => ({
  week_start, signups: 3, active_users: 7, returning_users: 2, reports, new_clusters: 1,
  corroborations: 1, checks: 9, feed_views: 40, shares: 2, instant_emails: 5, digest_emails: 12,
  email_visits: 6, unsubscribes: 0, flags: 1, removals: 0,
});

const summary: PilotSummary = {
  signups_in_market: 4, total_signups: 6,
  clusters_with_reports: 4, clusters_corroborated: 1,
  users_with_activity: 0, users_returning: 0,
  profiles_total: 6, profiles_off: 0,
};

const site = "https://scam-radar.example";

describe("weeklySummaryEmail", () => {
  const content = weeklySummaryEmail(summary, [week("2026-10-26", 1), week("2026-10-19", 6)], site)!;
  const email = renderAdminEmail(site, content);

  it("leads with the targets, one per line with progress", () => {
    expect(email.subject).toBe("ByeBell weekly summary: week of Oct 19");
    const lines = email.text.split("\n");
    const start = lines.indexOf("PILOT TARGETS");
    expect(start).toBe(2); // right after the heading
    expect(lines.slice(start + 1, start + 6)).toEqual([
      "✗ Sign-ups in the test area: 4 of 50",
      "✓ New reports last full week: 6 of 5",
      "✗ Alerts with an “I got this too”: 25% (1 of 4 visible alerts) · target 30%+",
      "– Users who came back in a later week: No data yet · target 40%+",
      "✓ Turned off emails: 0% (0 of 6 people) · target under 10%",
    ]);
  });

  it("groups last full week's numbers under short headings", () => {
    const order = ["PEOPLE", "ACTIVITY", "EMAIL", "MODERATION"].map((h) => email.text.indexOf(`\n${h}\n`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(email.text).toContain("Reports: 6");
    expect(email.text).toContain("Got this too: 1");
  });

  it("ends with a single View dashboard button", () => {
    expect(email.html.match(/<a [^>]*background|padding:14px 28px/g)).toHaveLength(1);
    expect(email.html).toContain(`href="${site}/admin/metrics"`);
    expect(email.text).toContain(`View dashboard: ${site}/admin/metrics`);
  });

  it("skips the email before there's a full week", () => {
    expect(weeklySummaryEmail(summary, [week("2026-10-19", 0)], site)).toBeNull();
  });
});

describe("flagEmail", () => {
  it("escapes and defangs the report and links to review", () => {
    const email = renderAdminEmail(site, flagEmail("spam", true, "<b>pay</b> at https://bad.example now", site));
    expect(email.subject).toBe("A report was auto-hidden after 3 flags");
    expect(email.html).toContain("&lt;b&gt;pay&lt;/b&gt;");
    expect(email.html).not.toContain("https://bad.example");
    expect(email.text).toContain("Reason: Spam or fake");
    expect(email.text).toContain(`Review reports: ${site}/admin`);
  });
});
