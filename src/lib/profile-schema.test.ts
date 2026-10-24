import { describe, expect, it } from "vitest";
import { profileSettingsSchema } from "./profile-schema";

describe("profileSettingsSchema", () => {
  it("accepts a 5-digit zip, an offered radius, and an alert mode", () => {
    expect(profileSettingsSchema.parse({ homeZip: " 02139 ", radiusMiles: "10", alertMode: "instant" })).toEqual({
      homeZip: "02139",
      radiusMiles: 10,
      alertMode: "instant",
    });
  });

  it("rejects bad zips and radii", () => {
    expect(profileSettingsSchema.safeParse({ homeZip: "2139", radiusMiles: "10", alertMode: "digest" }).success).toBe(false);
    expect(profileSettingsSchema.safeParse({ homeZip: "02139-1234", radiusMiles: "10", alertMode: "digest" }).success).toBe(false);
    expect(profileSettingsSchema.safeParse({ homeZip: "02139", radiusMiles: "7", alertMode: "digest" }).success).toBe(false);
  });

  it("rejects unknown alert modes", () => {
    expect(profileSettingsSchema.safeParse({ homeZip: "02139", radiusMiles: "10", alertMode: "sms" }).success).toBe(false);
  });
});
