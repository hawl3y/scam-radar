"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { sendInstantAlerts } from "@/lib/alerts/instant";
import { createClient } from "@/lib/supabase/server";

export type CorroborateState = { error?: string };

export async function corroborate(clusterId: string): Promise<CorroborateState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { error: "Please sign in first." };

  const { error } = await supabase.rpc("corroborate", { p_cluster_id: clusterId });
  if (error) {
    console.error("corroborate failed", error.message);
    return { error: "That didn't go through. Please try again." };
  }
  after(() => sendInstantAlerts(clusterId).catch((e) => console.error("instant alerts failed", e)));
  refresh();
  return {};
}
