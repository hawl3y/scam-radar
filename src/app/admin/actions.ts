"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminActionState = { error?: string };

// admin_set_report_status checks is_admin() in the database.
export async function setReportStatus(
  reportId: string,
  status: "removed" | "active",
): Promise<AdminActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_report_status", { p_report_id: reportId, p_status: status });
  if (error) {
    console.error("admin_set_report_status failed", error.message);
    return { error: "That didn't work. Please try again." };
  }
  refresh();
  return {};
}
