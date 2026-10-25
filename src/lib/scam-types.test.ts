import { describe, expect, it } from "vitest";
import { LEGACY_SCAM_TYPES, SCAM_TYPES, SCAM_TYPE_KEYS, scamTypeInfo, toScamType } from "./scam-types";

describe("scam types", () => {
  it("offers exactly the 7 groups", () => {
    expect(SCAM_TYPE_KEYS).toEqual(["fake_fee", "impersonation", "family_emergency", "too_good", "tech_support", "in_person", "other"]);
  });

  it("maps every legacy type to a group", () => {
    expect(toScamType("delivery")).toBe("fake_fee");
    expect(toScamType("toll")).toBe("fake_fee");
    expect(toScamType("government")).toBe("impersonation");
    expect(toScamType("bank")).toBe("impersonation");
    expect(toScamType("utility")).toBe("impersonation");
    expect(toScamType("prize")).toBe("too_good");
    expect(toScamType("job")).toBe("too_good");
    expect(toScamType("investment")).toBe("too_good");
    expect(toScamType("home_repair")).toBe("in_person");
    for (const group of Object.values(LEGACY_SCAM_TYPES)) expect(group in SCAM_TYPES).toBe(true);
  });

  it("keeps current groups and falls back to other", () => {
    expect(toScamType("family_emergency")).toBe("family_emergency");
    expect(toScamType("tech_support")).toBe("tech_support");
    expect(toScamType("unknown")).toBe("other");
    expect(scamTypeInfo("bank").label).toBe("Impersonation (government, bank, utility, police)");
  });
});
