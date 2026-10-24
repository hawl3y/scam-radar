import "server-only";
import { easternDate } from "@/lib/alerts/policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { aggregateDnc, daysToFetch, shiftDate, type DncRecord } from "./dnc";
import { parseIc3Rss } from "./ic3";

const DNC_URL = "https://api.ftc.gov/v0/dnc-complaints";
const IC3_RSS_URL = "https://www.ic3.gov/PSA/RSS";
const PAGE_SIZE = 50;
const MAX_PAGES_PER_DAY = 40;
const WINDOW_DAYS = 14;

async function fetchDncDay(apiKey: string, areaCode: string, day: string): Promise<DncRecord[]> {
  const records: DncRecord[] = [];
  for (let page = 0; page < MAX_PAGES_PER_DAY; page++) {
    const url = new URL(DNC_URL);
    url.searchParams.set("area_code", areaCode);
    url.searchParams.set("created_date_from", `${day} 00:00:00`);
    url.searchParams.set("created_date_to", `${day} 23:59:59`);
    url.searchParams.set("items_per_page", String(PAGE_SIZE));
    url.searchParams.set("offset", String(page * PAGE_SIZE));
    const res = await fetch(url, { headers: { "X-Api-Key": apiKey }, cache: "no-store" });
    if (!res.ok) throw new Error(`FTC DNC ${res.status} for ${areaCode} ${day}`);
    const body = (await res.json()) as { data?: DncRecord[] };
    const items = body.data ?? [];
    records.push(...items);
    // meta.record-total isn't reliable; a short page means we're done.
    if (items.length < PAGE_SIZE) return records;
  }
  throw new Error(`FTC DNC: more than ${MAX_PAGES_PER_DAY} pages for ${areaCode} ${day}`);
}

async function ingestDnc(now: Date) {
  const apiKey = process.env.FTC_API_KEY;
  if (!apiKey) {
    console.error("FTC_API_KEY missing; skipping Do Not Call ingestion");
    return { days: 0, failed: 0, skipped: true };
  }
  const admin = createAdminClient();
  const { data: markets, error } = await admin.from("markets").select("area_codes").eq("active", true);
  if (error) throw new Error(`markets lookup failed: ${error.message}`);
  const areaCodes = [...new Set((markets ?? []).flatMap((m) => m.area_codes as string[]))];

  const today = easternDate(now);
  const { data: ingested, error: ingestedError } = await admin.rpc("dnc_ingested_days", {
    p_since: shiftDate(today, WINDOW_DAYS),
  });
  if (ingestedError) throw new Error(`dnc_ingested_days failed: ${ingestedError.message}`);

  let days = 0;
  let failed = 0;
  for (const { areaCode, day } of daysToFetch(today, areaCodes, ingested as { area_code: string; day: string }[], WINDOW_DAYS)) {
    try {
      const records = await fetchDncDay(apiKey, areaCode, day);
      const { error: saveError } = await admin.rpc("replace_dnc_day", {
        p_area_code: areaCode,
        p_day: day,
        p_counts: aggregateDnc(records),
        p_total: records.length,
      });
      if (saveError) throw new Error(saveError.message);
      days++;
    } catch (e) {
      // Leave the day unrecorded so the next run retries it.
      console.error("DNC day failed", areaCode, day, e);
      failed++;
    }
  }
  return { days, failed, skipped: false };
}

async function ingestIc3() {
  const res = await fetch(IC3_RSS_URL, { cache: "no-store", headers: { "User-Agent": "scam-radar (community scam alerts)" } });
  if (!res.ok) throw new Error(`IC3 RSS ${res.status}`);
  const headlines = parseIc3Rss(await res.text());
  if (headlines.length === 0) return { headlines: 0 };
  const { error } = await createAdminClient()
    .from("public_scams")
    .upsert(headlines, { onConflict: "url", ignoreDuplicates: true });
  if (error) throw new Error(`public_scams upsert failed: ${error.message}`);
  return { headlines: headlines.length };
}

/** Daily: FTC Do Not Call counts for each market's area codes, and IC3 headlines. */
export async function runIngest(now = new Date()) {
  const [dnc, ic3] = await Promise.allSettled([ingestDnc(now), ingestIc3()]);
  return {
    dnc: dnc.status === "fulfilled" ? dnc.value : { error: String(dnc.reason) },
    ic3: ic3.status === "fulfilled" ? ic3.value : { error: String(ic3.reason) },
  };
}
