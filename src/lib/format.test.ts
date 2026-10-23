import { describe, expect, it } from "vitest";
import { formatDistance, formatTimeAgo } from "./format";

describe("formatDistance", () => {
  it("formats distances", () => {
    expect(formatDistance(0, true)).toBe("In your zip");
    expect(formatDistance(0.02, false)).toBe("0.1 mi away");
    expect(formatDistance(2.34, false)).toBe("2.3 mi away");
    expect(formatDistance(12.6, false)).toBe("13 mi away");
    expect(formatDistance(null, false)).toBeNull();
  });
});

describe("formatTimeAgo", () => {
  const now = new Date("2026-10-23T12:00:00Z");
  const ago = (s: number) => formatTimeAgo(new Date(now.getTime() - s * 1000), now);

  it("formats relative times", () => {
    expect(ago(10)).toBe("just now");
    expect(ago(5 * 60)).toBe("5 minutes ago");
    expect(ago(3 * 3600)).toBe("3 hours ago");
    expect(ago(30 * 3600)).toBe("yesterday");
    expect(ago(15 * 24 * 3600)).toBe("2 weeks ago");
  });

  it("treats future times as just now", () => {
    expect(ago(-30)).toBe("just now");
  });
});
