import type { ScamType } from "@/lib/scam-types";

// FTC Do Not Call complaint subjects, mapped to plain labels and our scam types
// (for tips). Subjects are stored normalized (see normalizeSubject).

type SubjectInfo = { label: string; scamType: ScamType };

const SUBJECTS: Record<string, SubjectInfo> = {
  "Calls pretending to be government, businesses, or family and friends": {
    label: "Impostor calls (government, businesses, or family)",
    scamType: "government",
  },
  "Reducing your debt (credit cards, mortgage, student loans)": { label: "Debt relief offers", scamType: "other" },
  "Computer & technical support": { label: "Tech support calls", scamType: "tech_support" },
  "Warranties & protection plans": { label: "Warranty and protection plan offers", scamType: "other" },
  "Energy, solar, & utilities": { label: "Energy, solar, and utility calls", scamType: "utility" },
  "Home improvement & cleaning": { label: "Home improvement offers", scamType: "home_repair" },
  "Lotteries, prizes & sweepstakes": { label: "Prize and sweepstakes calls", scamType: "prize" },
  "Medical & prescriptions": { label: "Medical and prescription offers", scamType: "other" },
  "Vacation & timeshares": { label: "Vacation and timeshare offers", scamType: "other" },
  "Work from home": { label: "Work-from-home offers", scamType: "job" },
};

/** Counted in totals but not shown as a trend: they don't tell neighbors what to watch for. */
const UNINFORMATIVE = new Set(["No Subject Provided", "Dropped call or no message", "Other", ""]);

/** The FTC data has inconsistent spacing ("Computer  & technical support"). */
export function normalizeSubject(subject: string | null | undefined): string {
  return (subject ?? "").replace(/\s+/g, " ").trim();
}

export function isInformative(subject: string): boolean {
  return !UNINFORMATIVE.has(normalizeSubject(subject));
}

export function subjectInfo(subject: string): SubjectInfo {
  const normalized = normalizeSubject(subject);
  return SUBJECTS[normalized] ?? { label: normalized, scamType: "other" };
}
