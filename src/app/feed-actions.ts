"use server";

import { createClient } from "@/lib/supabase/server";

/** Remember when a signed-in user last saw the feed, for "new near you". */
export async function markFeedVisited(): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return;
  const { error } = await supabase.from("profiles").update({ last_feed_visit_at: new Date().toISOString() }).eq("id", userId);
  if (error) console.error("markFeedVisited failed", error.message);
}
