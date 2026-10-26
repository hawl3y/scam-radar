// Keys are hashed before storage.

export type RateLimit = { name: string; limit: number; windowSeconds: number };

const HOUR = 3600;
const DAY = 24 * HOUR;

export const RATE_LIMITS = {
  reportHourly: { name: "report-hour", limit: 5, windowSeconds: HOUR },
  reportDaily: { name: "report-day", limit: 20, windowSeconds: DAY },
  corroborate: { name: "corroborate", limit: 30, windowSeconds: HOUR },
  rate: { name: "rate", limit: 60, windowSeconds: HOUR },
  flag: { name: "flag", limit: 20, windowSeconds: HOUR },
  check: { name: "check", limit: 20, windowSeconds: HOUR },
  // Report previews are public (sign-in happens at Post), so limit them per IP.
  reportPreview: { name: "report-preview", limit: 30, windowSeconds: HOUR },
  // Supabase's own auth limits are per IP, and every request reaches it from
  // our servers, so sign-in needs its own per-visitor and per-address limits.
  // Per address: stops email bombing and code guessing against one account.
  signInEmailIp: { name: "sign-in-email-ip", limit: 10, windowSeconds: HOUR },
  signInEmailAddress: { name: "sign-in-email-address", limit: 5, windowSeconds: HOUR },
  signInCodeIp: { name: "sign-in-code-ip", limit: 30, windowSeconds: HOUR },
  signInCodeAddress: { name: "sign-in-code-address", limit: 10, windowSeconds: HOUR },
} as const satisfies Record<string, RateLimit>;

export const RATE_LIMITED_MESSAGE = "You've done that a lot recently. Please try again in a bit.";
