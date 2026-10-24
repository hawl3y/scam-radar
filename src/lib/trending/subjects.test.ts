import { describe, expect, it } from "vitest";
import { isInformative, normalizeSubject, subjectInfo } from "./subjects";

describe("subjects", () => {
  it("normalizes the FTC's inconsistent spacing", () => {
    expect(normalizeSubject("Computer  & technical support ")).toBe("Computer & technical support");
    expect(subjectInfo("Computer  & technical support")).toEqual({ label: "Tech support calls", scamType: "tech_support" });
  });

  it("maps impostor calls to government tips", () => {
    expect(subjectInfo("Calls pretending to be government, businesses, or family and friends").scamType).toBe("government");
  });

  it("keeps unknown subjects as-is", () => {
    expect(subjectInfo("Brand new subject")).toEqual({ label: "Brand new subject", scamType: "other" });
  });

  it("hides subjects that don't say what to watch for", () => {
    expect(isInformative("No Subject Provided")).toBe(false);
    expect(isInformative("Dropped call or no message")).toBe(false);
    expect(isInformative("Other")).toBe(false);
    expect(isInformative("Medical & prescriptions")).toBe(true);
  });
});
