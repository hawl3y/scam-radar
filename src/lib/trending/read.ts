import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildTrends, type TrendRow, type TrendSummary } from "./trends";

export type Market = { id: number; name: string; state: string; area_codes: string[]; police_contact: string | null };
export type PublicHeadline = { source: "ic3" | "ftc"; title: string; published_at: string; url: string };

export async function getMarketForZip(zip: string): Promise<Market | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("market_for_zip", { p_zip: zip });
  if (error) throw new Error(`market_for_zip failed: ${error.message}`);
  return (data as Market[])[0] ?? null;
}

export async function getTrendSummary(marketId: number): Promise<TrendSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("market_trends", { p_market_id: marketId });
  if (error) throw new Error(`market_trends failed: ${error.message}`);
  return buildTrends(data as TrendRow[]);
}

export async function getZipState(zip: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("zip_state", { p_zip: zip });
  if (error) throw new Error(`zip_state failed: ${error.message}`);
  return (data as string | null) ?? null;
}

export async function getStateTrendSummary(state: string): Promise<TrendSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("state_trends", { p_state: state });
  if (error) throw new Error(`state_trends failed: ${error.message}`);
  return buildTrends(data as TrendRow[]);
}

export async function getHeadlines(limit = 3): Promise<PublicHeadline[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("latest_public_scams", { p_limit: limit });
  if (error) throw new Error(`latest_public_scams failed: ${error.message}`);
  return data as PublicHeadline[];
}
