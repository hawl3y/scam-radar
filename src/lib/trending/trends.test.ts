import { describe, expect, it } from "vitest";
import { buildTrends, describeChange, type TrendRow } from "./trends";

const row = (subject: string, thisWeek: number, lastWeek: number, days = 7): TrendRow => ({
  subject,
  this_week: thisWeek,
  last_week: lastWeek,
  week_ending: "2026-10-22",
  this_week_days: days,
  last_week_days: days,
});

describe("describeChange", () => {
  it("uses calm, plain wording", () => {
    expect(describeChange(214, 160)).toBe("up from 160 the week before");
    expect(describeChange(80, 120)).toBe("down from 120 the week before");
    expect(describeChange(105, 100)).toBe("about the same as the week before");
    expect(describeChange(5, 0)).toBe("new this week");
  });
});

describe("buildTrends", () => {
  it("ranks informative subjects and counts everything in the total", () => {
    const summary = buildTrends([
      row("Reducing your debt (credit cards, mortgage, student loans)", 120, 100),
      row("No Subject Provided", 60, 50),
      row("Computer  & technical support", 14, 30),
      row("Calls pretending to be government, businesses, or family and friends", 20, 10),
    ])!;
    expect(summary.totalThisWeek).toBe(214);
    expect(summary.trends.map((t) => t.label)).toEqual([
      "Debt relief offers",
      "Impostor calls (government, businesses, or family)",
      "Tech support calls",
    ]);
    expect(summary.trends[1].change).toBe("up from 10 the week before");
  });

  it("skips the comparison without two full weeks of data", () => {
    const summary = buildTrends([row("Computer & technical support", 10, 4, 5)])!;
    expect(summary.trends[0].change).toBeNull();
  });

  it("returns null with no data", () => {
    expect(buildTrends([])).toBeNull();
  });
});
