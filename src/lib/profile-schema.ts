import { z } from "zod";

// These schemas also run in the browser. Skip Zod's eval-based fast path, which
// probes with new Function() and trips the Content-Security-Policy.
z.config({ jitless: true });

export const RADIUS_OPTIONS = [5, 10, 25] as const;
export const DEFAULT_RADIUS = 10;

export const profileSettingsSchema = z.object({
  homeZip: z
    .string()
    .trim()
    .regex(/^[0-9]{5}$/, "Enter a 5-digit zip code."),
  radiusMiles: z.coerce
    .number()
    .refine((n) => (RADIUS_OPTIONS as readonly number[]).includes(n), "Choose a distance."),
  alertMode: z.enum(["digest", "instant", "off"], "Choose how we should email you."),
});
