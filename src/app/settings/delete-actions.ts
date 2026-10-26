"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeleteState = { error?: string };

export async function deleteAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  if (formData.get("confirm") !== "yes") return { error: "Please tick the box to confirm." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { error: "Please sign in again." };

  const admin = createAdminClient();
  // Clusters whose counts change once this user's rows are gone.
  const [{ data: reports }, { data: corroborations }] = await Promise.all([
    admin.from("reports").select("cluster_id").eq("user_id", userId),
    admin.from("corroborations").select("cluster_id").eq("user_id", userId),
  ]);
  const clusterIds = [
    ...new Set([...(reports ?? []), ...(corroborations ?? [])].map((r) => r.cluster_id).filter(Boolean)),
  ];

  // Cascades to profile, reports, corroborations, ratings, flags, and alert history.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("deleteUser failed", error.message);
    return { error: "We couldn't delete your account. Please try again or contact us." };
  }

  const { error: refreshError } = await admin.rpc("refresh_clusters", { p_cluster_ids: clusterIds });
  if (refreshError) console.error("refresh_clusters failed", refreshError.message);

  await supabase.auth.signOut({ scope: "local" });
  redirect("/?deleted=1");
}
