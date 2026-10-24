import { describe, expect, it } from "vitest";
import { INSTANT_DAILY_LIMIT, INSTANT_THRESHOLD, easternDate, groupDigest, isHot, underInstantLimit } from "./policy";

describe("isHot", () => {
  it("defaults to a threshold of 3", () => {
    expect(INSTANT_THRESHOLD).toBe(3);
  });

  it("counts reports plus corroborations", () => {
    expect(isHot(2, 0)).toBe(false);
    expect(isHot(3, 0)).toBe(true);
    expect(isHot(1, 2)).toBe(true);
    expect(isHot(2, 1, 4)).toBe(false);
  });
});

describe("underInstantLimit (throttling)", () => {
  it("allows up to 3 instant emails a day", () => {
    expect(INSTANT_DAILY_LIMIT).toBe(3);
    const recipients = [0, 1, 2, 3, 5].map((n, i) => ({ id: i, instant_last_24h: n }));
    expect(underInstantLimit(recipients).map((r) => r.id)).toEqual([0, 1, 2]);
  });
});

describe("easternDate", () => {
  it("uses the Eastern calendar day", () => {
    // 03:00 UTC on Oct 24 is still Oct 23 in New York (EDT, UTC-4).
    expect(easternDate(new Date("2026-10-24T03:00:00Z"))).toBe("2026-10-23");
    expect(easternDate(new Date("2026-10-24T12:00:00Z"))).toBe("2026-10-24");
    // Winter (EST, UTC-5).
    expect(easternDate(new Date("2026-12-01T04:30:00Z"))).toBe("2026-11-30");
  });
});

describe("groupDigest", () => {
  it("groups by user, newest first, capped", () => {
    const rows = [
      { user_id: "a", cluster: 1, last_seen: "2026-10-23T10:00:00Z" },
      { user_id: "b", cluster: 2, last_seen: "2026-10-23T09:00:00Z" },
      { user_id: "a", cluster: 3, last_seen: "2026-10-23T12:00:00Z" },
      { user_id: "a", cluster: 4, last_seen: "2026-10-23T11:00:00.123456+00:00" },
    ];
    const groups = groupDigest(rows, 2);
    expect(groups).toHaveLength(2);
    const a = groups.find((g) => g.userId === "a")!;
    expect(a.items.map((i) => i.cluster)).toEqual([3, 4]);
    expect(a.totalItems).toBe(3);
  });
});
