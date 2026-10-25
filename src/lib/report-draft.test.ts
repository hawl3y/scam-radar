import { describe, expect, it } from "vitest";
import { DRAFT_KEY, DRAFT_MAX_AGE_MS, LAST_ZIP_KEY, clearLocalReportData, loadDraft, saveDraft } from "./report-draft";

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}
const draft = { channel: "text", scamType: "fake_fee", zip: "10989", description: "Call [phone] about your package" };

describe("report draft", () => {
  it("saves and restores within 24 hours", () => {
    const s = memoryStore();
    saveDraft(s, draft, 1_000);
    expect(loadDraft(s, 1_000 + 60_000)).toMatchObject(draft);
  });

  it("expires after 24 hours and removes it", () => {
    const s = memoryStore();
    saveDraft(s, draft, 0);
    expect(loadDraft(s, DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(s.m.has(DRAFT_KEY)).toBe(false);
  });

  it("ignores malformed data", () => {
    const s = memoryStore();
    s.setItem(DRAFT_KEY, "{not json");
    expect(loadDraft(s)).toBeNull();
    s.setItem(DRAFT_KEY, JSON.stringify({ channel: "text" }));
    expect(loadDraft(s)).toBeNull();
  });

  it("clears the draft and remembered zip for shared computers", () => {
    const s = memoryStore();
    saveDraft(s, draft);
    s.setItem(LAST_ZIP_KEY, "10989");
    clearLocalReportData(s);
    expect(s.m.size).toBe(0);
  });
});
