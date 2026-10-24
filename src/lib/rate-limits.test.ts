import { describe, expect, it } from "vitest";
import { RATE_LIMITS } from "./rate-limits";

describe("RATE_LIMITS", () => {
  it("matches the approved limits", () => {
    expect(RATE_LIMITS.reportHourly).toMatchObject({ limit: 5, windowSeconds: 3600 });
    expect(RATE_LIMITS.reportDaily).toMatchObject({ limit: 20, windowSeconds: 86400 });
    expect(RATE_LIMITS.corroborate).toMatchObject({ limit: 30, windowSeconds: 3600 });
    expect(RATE_LIMITS.rate).toMatchObject({ limit: 60, windowSeconds: 3600 });
    expect(RATE_LIMITS.flag).toMatchObject({ limit: 20, windowSeconds: 3600 });
    expect(RATE_LIMITS.check).toMatchObject({ limit: 20, windowSeconds: 3600 });
  });

  it("uses distinct key names", () => {
    const names = Object.values(RATE_LIMITS).map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
