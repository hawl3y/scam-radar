"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assignCluster } from "@/lib/clusters";
import { redact, type RedactionKind } from "@/lib/redaction";
import { reportDraftSchema, type ReportDraft } from "@/lib/report-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type FieldErrors = Partial<Record<keyof ReportDraft | "form", string[]>>;

export type ReportState =
  | { step: "draft"; version: number; values?: Partial<ReportDraft>; errors?: FieldErrors }
  | {
      step: "preview";
      version: number;
      draft: ReportDraft;
      found: Partial<Record<RedactionKind, number>>;
      notice?: string;
      errors?: FieldErrors;
    };

function readDraft(formData: FormData) {
  return {
    channel: String(formData.get("channel") ?? ""),
    scamType: String(formData.get("scamType") ?? ""),
    description: String(formData.get("description") ?? ""),
    zip: String(formData.get("zip") ?? ""),
  };
}

async function zipExists(zip: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("zip_centroids").select("zip").eq("zip", zip).maybeSingle();
  return Boolean(data);
}

const UNKNOWN_ZIP = { zip: ["We don't recognize that zip code. Try the zip where this happened."] };

async function preview(formData: FormData): Promise<ReportState> {
  const raw = readDraft(formData);
  const parsed = reportDraftSchema.safeParse(raw);
  if (!parsed.success) {
    return { step: "draft", version: Date.now(), values: raw as Partial<ReportDraft>, errors: z.flattenError(parsed.error).fieldErrors };
  }
  if (!(await zipExists(parsed.data.zip))) {
    return { step: "draft", version: Date.now(), values: parsed.data, errors: UNKNOWN_ZIP };
  }

  const { text, found } = redact(parsed.data.description);
  return { step: "preview", version: Date.now(), draft: { ...parsed.data, description: text }, found };
}

async function post(formData: FormData): Promise<ReportState> {
  const parsed = reportDraftSchema.safeParse(readDraft(formData));
  if (!parsed.success) {
    const draft = readDraft(formData) as ReportDraft;
    return { step: "preview", version: Date.now(), draft, found: {}, errors: z.flattenError(parsed.error).fieldErrors };
  }

  // Redact again: the reporter may have edited the text after the preview.
  const { text, found } = redact(parsed.data.description);
  if (text !== parsed.data.description) {
    return {
      step: "preview",
      version: Date.now(),
      draft: { ...parsed.data, description: text },
      found,
      notice: "We hid a few more details. Please check it again, then post.",
    };
  }
  if (!(await zipExists(parsed.data.zip))) {
    return { step: "draft", version: Date.now(), values: parsed.data, errors: UNKNOWN_ZIP };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) {
    return { step: "preview", version: Date.now(), draft: parsed.data, found: {}, errors: { form: ["Your session ended. Please sign in again."] } };
  }

  const { data, error } = await createAdminClient()
    .from("reports")
    .insert({
      user_id: userId,
      scam_type: parsed.data.scamType,
      channel: parsed.data.channel,
      description_redacted: text,
      zip: parsed.data.zip,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("report insert failed", error?.message);
    return { step: "preview", version: Date.now(), draft: parsed.data, found: {}, errors: { form: ["We couldn't post your report. Please try again."] } };
  }

  let clusterId: string | null = null;
  try {
    clusterId = await assignCluster(data.id);
  } catch (e) {
    // The report is saved; don't show the form again (it would invite a duplicate).
    console.error("cluster assignment failed", e);
  }

  redirect(clusterId ? `/alerts/${clusterId}?posted=1` : "/");
}

export async function reportAction(prev: ReportState, formData: FormData): Promise<ReportState> {
  switch (formData.get("intent")) {
    case "post":
      return post(formData);
    case "back":
      return { step: "draft", version: Date.now(), values: readDraft(formData) as Partial<ReportDraft> };
    default:
      return preview(formData);
  }
}
