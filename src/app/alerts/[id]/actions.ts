"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendInstantAlerts } from "@/lib/alerts/instant";
import { notifyAdminsOfFlag } from "@/lib/alerts/admin-notify";
import { allowRequest } from "@/lib/rate-limit";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS } from "@/lib/rate-limits";
import { redact } from "@/lib/redaction";
import { createClient } from "@/lib/supabase/server";

export type CorroborateState = { error?: string };
export type ExampleActionState = { error?: string; message?: string };

async function signedInUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  return { supabase, userId: auth?.claims?.sub as string | undefined };
}

export async function corroborate(clusterId: string): Promise<CorroborateState> {
  const { supabase, userId } = await signedInUser();
  if (!userId) return { error: "Please sign in first." };
  if (!(await allowRequest(RATE_LIMITS.corroborate, userId))) return { error: RATE_LIMITED_MESSAGE };

  const { error } = await supabase.rpc("corroborate", { p_cluster_id: clusterId });
  if (error) {
    console.error("corroborate failed", error.message);
    return { error: "That didn't go through. Please try again." };
  }
  after(() => sendInstantAlerts(clusterId).catch((e) => console.error("instant alerts failed", e)));
  refresh();
  return {};
}

export async function rateReport(reportId: string, _prev: ExampleActionState, formData: FormData): Promise<ExampleActionState> {
  const { supabase, userId } = await signedInUser();
  if (!userId) return { error: "Please sign in first." };
  if (!(await allowRequest(RATE_LIMITS.rate, userId))) return { error: RATE_LIMITED_MESSAGE };

  const helpful = formData.get("helpful") === "yes";
  const { error } = await supabase.rpc("rate_report", { p_report_id: reportId, p_helpful: helpful });
  if (error) {
    console.error("rate_report failed", error.message);
    return { error: "That didn't go through. Please try again." };
  }
  refresh();
  return { message: "Thanks for the feedback." };
}

const FLAG_REASONS = ["personal_info", "private_person", "not_a_scam", "spam", "other"] as const;

export async function flagReport(
  reportId: string,
  clusterId: string,
  _prev: ExampleActionState,
  formData: FormData,
): Promise<ExampleActionState> {
  const { supabase, userId } = await signedInUser();
  if (!userId) return { error: "Please sign in first." };

  const reason = FLAG_REASONS.find((r) => r === formData.get("reason"));
  if (!reason) return { error: "Choose what's wrong." };
  if (!(await allowRequest(RATE_LIMITS.flag, userId))) return { error: RATE_LIMITED_MESSAGE };

  // Notes are user text too: redact before saving.
  const details = redact(String(formData.get("details") ?? "").slice(0, 500)).text.trim();
  const { data, error } = await supabase.rpc("flag_report", { p_report_id: reportId, p_reason: reason, p_details: details });
  if (error) {
    console.error("flag_report failed", error.message);
    return { error: "That didn't go through. Please try again." };
  }

  if (data !== "already_flagged") {
    after(() => notifyAdminsOfFlag(reportId, reason, data === "hidden").catch((e) => console.error("flag notify failed", e)));
  }
  // This flag hid the report. It may have been the cluster's last visible one,
  // so let the page explain instead of refreshing into a 404.
  if (data === "hidden") redirect(`/alerts/${clusterId}?hidden=1`);
  refresh();
  return {
    message:
      data === "already_flagged" ? "You already reported a problem with this." : "Thanks. We'll review it.",
  };
}
