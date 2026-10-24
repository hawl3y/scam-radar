"use server";

import { z } from "zod";
import { findMatchingClusters, type ClusterMatch } from "@/lib/clusters";
import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS } from "@/lib/rate-limits";
import { redact } from "@/lib/redaction";
import { recordUsage } from "@/lib/usage";
import { createClient } from "@/lib/supabase/server";

const checkSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, "Please paste the message or describe what happened.")
    .max(2000, "Please keep it under 2000 characters."),
  zip: z
    .string()
    .trim()
    .regex(/^([0-9]{5})?$/, "Enter a 5-digit zip code, or leave it blank."),
});

type Values = { text: string; zip: string };

export type CheckState =
  | { status: "idle"; values?: Values }
  | { status: "error"; values: Values; errors: Partial<Record<"text" | "zip" | "form", string[]>> }
  | { status: "result"; values: Values; matches: ClusterMatch[]; zip: string | null };

export async function check(_prev: CheckState, formData: FormData): Promise<CheckState> {
  const values = { text: String(formData.get("text") ?? ""), zip: String(formData.get("zip") ?? "") };
  const parsed = checkSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", values, errors: z.flattenError(parsed.error).fieldErrors };
  }

  const zip = parsed.data.zip || null;
  if (zip) {
    const supabase = await createClient();
    const { data } = await supabase.from("zip_centroids").select("zip").eq("zip", zip).maybeSingle();
    if (!data) return { status: "error", values, errors: { zip: ["We don't recognize that zip code."] } };
  }

  if (!(await allowRequest(RATE_LIMITS.check))) {
    return { status: "error", values, errors: { form: [RATE_LIMITED_MESSAGE] } };
  }

  // Match on redacted text only. Nothing here is stored.
  const { text } = redact(parsed.data.text);
  const matches = await findMatchingClusters(text, zip);
  await recordUsage("check");
  return { status: "result", values, matches, zip };
}
