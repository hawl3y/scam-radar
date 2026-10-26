import { z } from "zod";
import { CHANNEL_KEYS, SCAM_TYPE_KEYS } from "./scam-types";

// These schemas also run in the browser. Skip Zod's eval-based fast path, which
// probes with new Function() and trips the Content-Security-Policy.
z.config({ jitless: true });

export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 2000;

export const reportDraftSchema = z.object({
  channel: z.enum(CHANNEL_KEYS, "Choose how they contacted you."),
  scamType: z.enum(SCAM_TYPE_KEYS, "Choose the kind of scam."),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Please write at least ${DESCRIPTION_MIN} characters.`)
    .max(DESCRIPTION_MAX, `Please keep it under ${DESCRIPTION_MAX} characters.`),
  zip: z
    .string()
    .trim()
    .regex(/^[0-9]{5}$/, "Enter a 5-digit zip code."),
});

export type ReportDraft = z.infer<typeof reportDraftSchema>;
