import { describe, expect, it } from "vitest";
import { profileSettingsSchema } from "./profile-schema";

describe("profileSettingsSchema", () => {
  it("accepts a 5-digit zip and an offered radius", () => {
    expect(profileSettingsSchema.parse({ homeZip: " 02139 ", radiusMiles: "10" })).toEqual({
      homeZip: "02139",
      radiusMiles: 10,
    });
  });

  it("rejects bad zips and radii", () => {
    expect(profileSettingsSchema.safeParse({ homeZip: "2139", radiusMiles: "10" }).success).toBe(false);
    expect(profileSettingsSchema.safeParse({ homeZip: "02139-1234", radiusMiles: "10" }).success).toBe(false);
    expect(profileSettingsSchema.safeParse({ homeZip: "02139", radiusMiles: "7" }).success).toBe(false);
  });
});
