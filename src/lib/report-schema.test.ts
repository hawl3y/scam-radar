import { describe, expect, it } from "vitest";
import { reportDraftSchema } from "./report-schema";

const valid = {
  channel: "text",
  scamType: "fake_fee",
  description: "Got a text saying my package is held and to pay a fee.",
  zip: "02139",
};

describe("reportDraftSchema", () => {
  it("accepts a valid draft", () => {
    expect(reportDraftSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects unknown channels and types, short text, and bad zips", () => {
    expect(reportDraftSchema.safeParse({ ...valid, channel: "fax" }).success).toBe(false);
    expect(reportDraftSchema.safeParse({ ...valid, scamType: "nope" }).success).toBe(false);
    expect(reportDraftSchema.safeParse({ ...valid, description: "too short" }).success).toBe(false);
    expect(reportDraftSchema.safeParse({ ...valid, zip: "123" }).success).toBe(false);
  });
});
