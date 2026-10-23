import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/settings")).toBe("/settings");
    expect(safeNext("/a?b=1")).toBe("/a?b=1");
  });

  it("falls back to / for missing or off-site values", () => {
    for (const bad of [null, undefined, "", "settings", "https://evil.test", "//evil.test", "/\\evil.test"]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});
