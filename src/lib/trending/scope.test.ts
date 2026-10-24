import { describe, expect, it } from "vitest";
import { chooseScope, joinAreaCodes, scopeLabels } from "./scope";
import type { TrendSummary } from "./trends";

const summary = (days = 7, total = 192): TrendSummary => ({
  weekEnding: "2026-10-22",
  daysThisWeek: days,
  totalThisWeek: total,
  trends: [{ label: "Debt relief offers", scamType: "other", tip: "t", thisWeek: 56, change: null }],
});
const empty: TrendSummary = { ...summary(), trends: [] };
const njMarket = { state: "NJ", area_codes: ["201", "551"] };

describe("chooseScope", () => {
  it("prefers the market when it has data", () => {
    expect(chooseScope({ state: "NJ", market: njMarket, marketSummary: summary(), stateSummary: summary() }).kind).toBe("market");
  });

  it("falls back to the state when the market has no data yet", () => {
    expect(chooseScope({ state: "NJ", market: njMarket, marketSummary: empty, stateSummary: summary() }).kind).toBe("state");
  });

  it("uses the state outside any market", () => {
    expect(chooseScope({ state: "PA", market: null, marketSummary: null, stateSummary: summary() }).kind).toBe("state");
  });

  it("returns none without data", () => {
    expect(chooseScope({ state: "WY", market: null, marketSummary: null, stateSummary: null }).kind).toBe("none");
    expect(chooseScope({ state: null, market: null, marketSummary: null, stateSummary: null }).kind).toBe("none");
  });
});

describe("scopeLabels", () => {
  it("labels markets by state and area codes, not by town", () => {
    const labels = scopeLabels({ kind: "market", state: "NY", areaCodes: ["845"], summary: summary() });
    expect(labels.heading).toBe("Unwanted calls reported in New York (845 area code)");
    expect(labels.intro).toBe(
      "Reported to the FTC by people in New York with 845 phone numbers, in the 7 days through Oct 22: 192. The most common:",
    );
    expect(`${labels.heading} ${labels.intro}`).not.toMatch(/near you/i);
  });

  it("labels states and partial weeks honestly", () => {
    const labels = scopeLabels({ kind: "state", state: "NJ", summary: summary(3, 1500) });
    expect(labels.heading).toBe("Unwanted calls reported in New Jersey");
    expect(labels.intro).toContain("in the 3 days of data so far, through Oct 22: 1500");
  });

  it("joins several area codes", () => {
    expect(joinAreaCodes(["201", "551"])).toBe("201 and 551");
    expect(joinAreaCodes(["201", "551", "862"])).toBe("201, 551, and 862");
    expect(scopeLabels({ kind: "market", state: "NJ", areaCodes: ["201", "551"], summary: summary() }).heading).toBe(
      "Unwanted calls reported in New Jersey (201 and 551 area codes)",
    );
  });
});
