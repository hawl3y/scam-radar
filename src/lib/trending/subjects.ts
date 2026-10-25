import { SCAM_TYPES, type ScamType } from "@/lib/scam-types";

// FTC Do Not Call complaint subjects, mapped to plain labels and our scam types
// (for tips). Subjects are stored normalized (see normalizeSubject).

type SubjectInfo = { label: string; scamType: ScamType; tip: string };

const SUBJECTS: Record<string, SubjectInfo> = {
  "Calls pretending to be government, businesses, or family and friends": {
    label: "Impostor calls (government, businesses, or family)",
    scamType: "impersonation",
    tip: "Hang up and call back using a number you look up yourself. Real agencies don't demand payment over the phone.",
  },
  "Reducing your debt (credit cards, mortgage, student loans)": {
    label: "Debt relief offers",
    scamType: "other",
    tip: "Be wary of anyone promising to cut your debt for an upfront fee. Call your lender using the number on your statement.",
  },
  "Computer & technical support": {
    label: "Tech support calls",
    scamType: "tech_support",
    tip: "Microsoft, Apple, and other companies don't call about viruses. Never let a caller into your computer.",
  },
  "Warranties & protection plans": {
    label: "Warranty and protection plan offers",
    scamType: "other",
    tip: "\"Final notice\" car or home warranty calls are sales pitches or scams. Check with your dealer or insurer directly.",
  },
  "Energy, solar, & utilities": {
    label: "Energy, solar, and utility calls",
    scamType: "impersonation",
    tip: "Utilities don't threaten same-day shutoffs by phone. Call the number on your bill to check your account.",
  },
  "Home improvement & cleaning": {
    label: "Home improvement offers",
    scamType: "in_person",
    tip: "Choose your own licensed contractor, get a written estimate, and never pay the full amount up front.",
  },
  "Lotteries, prizes & sweepstakes": {
    label: "Prize and sweepstakes calls",
    scamType: "too_good",
    tip: "You can't win a contest you didn't enter, and real prizes never require a fee.",
  },
  "Medical & prescriptions": {
    label: "Medical and prescription offers",
    scamType: "other",
    tip: "Don't give your Medicare or insurance number to callers. Call the number on your card if you have questions.",
  },
  "Vacation & timeshares": {
    label: "Vacation and timeshare offers",
    scamType: "other",
    tip: "\"Free trip\" calls often hide fees or high-pressure sales. Don't share card details on a call you didn't expect.",
  },
  "Work from home": {
    label: "Work-from-home offers",
    scamType: "too_good",
    tip: "Real jobs don't ask you to pay to start, or to send back money from a check they mailed you.",
  },
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
  return SUBJECTS[normalized] ?? { label: normalized, scamType: "other", tip: SCAM_TYPES.other.tips[0] };
}
