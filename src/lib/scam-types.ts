// Must match the enums in supabase/migrations/*_create_reports.sql.

export const CHANNELS = {
  text: "Text message",
  call: "Phone call",
  email: "Email",
  website: "Website or ad",
  visit: "In person",
  other: "Other",
} as const;

export type Channel = keyof typeof CHANNELS;

type ScamTypeInfo = { label: string; tips: string[] };

export const SCAM_TYPES = {
  government: {
    label: "Government impersonation (IRS, Social Security, police)",
    tips: [
      "Government agencies don't call, text, or email demanding immediate payment.",
      "Hang up and call the agency using the number on its official website.",
      "Never pay with gift cards, wire transfers, or cryptocurrency.",
    ],
  },
  bank: {
    label: "Bank or fraud alert",
    tips: [
      "Don't use links or numbers in the message. Call the number on the back of your card.",
      "Your bank will never ask for your password, PIN, or a code sent to your phone.",
      "If you shared details, call your bank right away to lock your account.",
    ],
  },
  delivery: {
    label: "Package delivery",
    tips: [
      "Don't click the link. Check tracking on the carrier's own website or app.",
      "Carriers don't ask for payment by text to redeliver a package.",
    ],
  },
  tech_support: {
    label: "Tech support or computer virus",
    tips: [
      "Real companies don't call you about viruses or show pop-ups with phone numbers.",
      "Never let a caller control your computer remotely.",
      "If you let someone in, disconnect from the internet and get local help.",
    ],
  },
  utility: {
    label: "Utility shutoff",
    tips: [
      "Utilities send written notice before shutting off service.",
      "Hang up and call the number on your bill to check your account.",
      "Never pay with gift cards or a payment app to avoid a shutoff.",
    ],
  },
  prize: {
    label: "Prize, lottery, or sweepstakes",
    tips: [
      "You can't win a contest you didn't enter.",
      "Real prizes never require you to pay a fee or taxes up front.",
    ],
  },
  family_emergency: {
    label: "Family emergency or grandparent scam",
    tips: [
      "Hang up and call your family member directly on a number you know.",
      "Ask a question only the real person would know.",
      "Scammers push for secrecy and speed. Take your time and tell someone.",
    ],
  },
  job: {
    label: "Job offer",
    tips: [
      "Real employers don't send checks and ask you to send money back.",
      "Be wary of jobs offered by text or chat without an interview.",
    ],
  },
  investment: {
    label: "Investment or cryptocurrency",
    tips: [
      "Guaranteed high returns are a warning sign.",
      "Be cautious of investment advice from people you met online.",
    ],
  },
  home_repair: {
    label: "Home repair or contractor",
    tips: [
      "Be wary of door-to-door offers for repairs you didn't request.",
      "Get written estimates and check licenses before paying anything.",
      "Never pay the full amount up front.",
    ],
  },
  toll: {
    label: "Unpaid toll or parking",
    tips: [
      "Don't click the link. Check your account on the toll agency's official website.",
      "Toll agencies don't threaten immediate penalties by text.",
    ],
  },
  other: {
    label: "Something else",
    tips: [
      "Don't click links or call numbers in unexpected messages.",
      "Never pay with gift cards, wire transfers, or cryptocurrency.",
      "When in doubt, talk to someone you trust before acting.",
    ],
  },
} as const satisfies Record<string, ScamTypeInfo>;

export type ScamType = keyof typeof SCAM_TYPES;

export const CHANNEL_KEYS = Object.keys(CHANNELS) as [Channel, ...Channel[]];
export const SCAM_TYPE_KEYS = Object.keys(SCAM_TYPES) as [ScamType, ...ScamType[]];
