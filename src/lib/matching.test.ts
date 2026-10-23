import { describe, expect, it } from "vitest";
import { CHECK_MATCH_THRESHOLD, JOIN_THRESHOLD, checkMatches, chooseCluster } from "./matching";

describe("thresholds", () => {
  it("sit above the worst different-scam score from calibration", () => {
    const worstDifferentScam = 0.306;
    expect(CHECK_MATCH_THRESHOLD).toBeGreaterThan(worstDifferentScam);
    expect(JOIN_THRESHOLD).toBeGreaterThan(CHECK_MATCH_THRESHOLD);
  });

  it("join every pasted same-scam pair from calibration", () => {
    const lowestPastedSameScam = 0.545;
    expect(JOIN_THRESHOLD).toBeLessThanOrEqual(lowestPastedSameScam);
  });
});

describe("chooseCluster", () => {
  it("joins at or above the threshold", () => {
    expect(chooseCluster({ cluster_id: "c1", score: JOIN_THRESHOLD })).toBe("c1");
    expect(chooseCluster({ cluster_id: "c1", score: 0.8 })).toBe("c1");
  });

  it("starts a new cluster below the threshold or with no candidate", () => {
    expect(chooseCluster({ cluster_id: "c1", score: JOIN_THRESHOLD - 0.01 })).toBeNull();
    expect(chooseCluster(null)).toBeNull();
    expect(chooseCluster({ cluster_id: "c1", score: Number.NaN })).toBeNull();
  });
});

describe("checkMatches", () => {
  it("keeps close matches, best first", () => {
    const result = checkMatches([
      { id: "a", score: 0.31 },
      { id: "b", score: 0.5 },
      { id: "c", score: CHECK_MATCH_THRESHOLD },
      { id: "d", score: 0.9 },
    ]);
    expect(result.map((r) => r.id)).toEqual(["d", "b", "c"]);
  });
});
