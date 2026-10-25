// The report draft kept on this device between steps (e.g. while signing in).
// Only the redacted version is ever saved, never the raw text. It's cleared on
// post, sign-out, "Discard draft", or after 24 hours, since pilot users may be
// on shared computers.

export type StoredDraft = {
  channel: string;
  scamType: string;
  zip: string;
  /** Redacted text, as returned by the preview. */
  description: string;
  savedAt: number;
};

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const DRAFT_KEY = "byebell:report-draft";
export const LAST_ZIP_KEY = "byebell:last-zip";
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function saveDraft(store: KeyValueStore, draft: Omit<StoredDraft, "savedAt">, now = Date.now()) {
  store.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: now }));
}

export function parseDraft(raw: string | null, now = Date.now()): StoredDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Partial<StoredDraft>;
    const ok =
      typeof d.channel === "string" &&
      typeof d.scamType === "string" &&
      typeof d.zip === "string" &&
      typeof d.description === "string" &&
      typeof d.savedAt === "number";
    if (!ok || now - (d.savedAt as number) > DRAFT_MAX_AGE_MS) return null;
    return d as StoredDraft;
  } catch {
    return null;
  }
}

export function loadDraft(store: KeyValueStore, now = Date.now()): StoredDraft | null {
  const draft = parseDraft(store.getItem(DRAFT_KEY), now);
  if (!draft) store.removeItem(DRAFT_KEY);
  return draft;
}

/** Everything this app keeps in the browser that a shared-computer user might leave behind. */
export function clearLocalReportData(store: KeyValueStore) {
  store.removeItem(DRAFT_KEY);
  store.removeItem(LAST_ZIP_KEY);
}
