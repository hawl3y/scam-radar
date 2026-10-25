import { describe, expect, it } from "vitest";
import { isInformative, normalizeSubject, subjectInfo } from "./subjects";

describe("subjects", () => {
  it("normalizes the FTC's inconsistent spacing", () => {
    expect(normalizeSubject("Computer  & technical support ")).toBe("Computer & technical support");
    expect(subjectInfo("Computer  & technical support")).toMatchObject({ label: "Tech support calls", scamType: "tech_support" });
  });

  it("maps impostor calls to impersonation tips", () => {
    expect(subjectInfo("Calls pretending to be government, businesses, or family and friends").scamType).toBe("impersonation");
  });

  it("keeps unknown subjects as-is, with a general tip", () => {
    expect(subjectInfo("Brand new subject")).toEqual({
      label: "Brand new subject",
      scamType: "other",
      tip: "Don't click links or call numbers in unexpected messages.",
    });
  });

  it("gives every mapped subject its own tip", () => {
    const subjects = [
      "Calls pretending to be government, businesses, or family and friends",
      "Reducing your debt (credit cards, mortgage, student loans)",
      "Computer & technical support",
      "Warranties & protection plans",
      "Energy, solar, & utilities",
      "Home improvement & cleaning",
      "Lotteries, prizes & sweepstakes",
      "Medical & prescriptions",
      "Vacation & timeshares",
      "Work from home",
    ];
    const tips = subjects.map((s) => subjectInfo(s).tip);
    expect(new Set(tips).size).toBe(subjects.length);
    expect(subjectInfo("Medical & prescriptions").tip).toMatch(/Medicare/);
  });

  it("hides subjects that don't say what to watch for", () => {
    expect(isInformative("No Subject Provided")).toBe(false);
    expect(isInformative("Dropped call or no message")).toBe(false);
    expect(isInformative("Other")).toBe(false);
    expect(isInformative("Medical & prescriptions")).toBe(true);
  });
});
