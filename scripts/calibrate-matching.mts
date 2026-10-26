// Calibrates matching thresholds against real pg_trgm on the linked (dev) project.
// Requires the Supabase CLI linked to dev. Read-only: runs one SELECT.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Each group is one scam as different neighbors might report it (already redacted).
// Variant 0 and 1 are pasted messages; later variants are descriptions.
const GROUPS: Record<string, string[]> = {
  usps: [
    "USPS: Your package is on hold due to an incomplete address. Please update your details within 24 hours: https://usps-redelivery-help.com/track",
    "Got a text: USPS: Your package is on hold due to an incomplete address. Update your details within 24 hours at usps-parcel-update.top",
    "Text saying my USPS package is on hold because of an incomplete address, with a link to update my details",
  ],
  toll: [
    "E-ZPass: You have an unpaid toll balance of $4.15. Pay within 2 days to avoid a $50 late fee: https://ezpass-tollpay.xyz",
    "You have an unpaid toll balance of $6.99. Pay now to avoid a late fee: ezpass-ny-pay.com",
    "Text about an unpaid toll with a link to pay and a threat of late fees",
  ],
  grandparent: [
    "Got a call from someone crying, Grandma it's me, I was in a car accident and I'm in jail, I need $5,000 for bail, please don't tell mom",
    "Caller said Grandma it's me, I was in an accident and I'm in jail and need bail money, don't tell mom. Then a lawyer [name] got on",
    "Someone pretending to be my grandson called saying he was arrested and needed bail money in gift cards",
  ],
  ssa: [
    "Robocall: your Social Security number has been suspended due to suspicious activity. Press 1 to speak to an officer",
    "Call said my Social Security number has been suspended because of suspicious activity, press 1 to speak with an officer",
    "Caller claimed to be from the Social Security Administration and said I would be arrested unless I paid",
  ],
  bank: [
    "Chase Fraud Alert: Did you attempt a purchase of $849.99 at Walmart? Reply YES or NO",
    "Chase Fraud Alert: Did you attempt a purchase of $749.00 at Best Buy? Reply YES or NO. Then someone called [phone]",
    "Fake bank text asking me to confirm a big purchase I didn't make",
  ],
  techsupport: [
    "A popup said Windows is locked because of a virus. Call Microsoft Support at [phone] immediately. Do not shut down your computer",
    "Popup on my laptop: Windows is locked because of a virus, call Microsoft Support at [phone] immediately, do not turn off your computer",
    "My browser froze with a warning that my computer was infected and a number to call",
  ],
  utility: [
    "Caller said he was from the electric company and our power would be shut off in one hour unless we paid with a prepaid card",
    "Man called saying he was from the electric company, power will be shut off in an hour unless we pay with a prepaid card",
    "Someone said our electricity would be disconnected today unless we paid immediately",
  ],
  paving: [
    "Two men knocked on my door offering to pave the driveway with leftover asphalt from another job, cash only, today only",
    "Guys came to the door saying they had leftover asphalt from another job and could pave our driveway, cash only today",
    "Door-to-door crew offered cheap driveway sealing if we paid cash right away",
  ],
};

type Item = { id: string; group: string; variant: number; text: string };
const items: Item[] = Object.entries(GROUPS).flatMap(([group, texts]) =>
  texts.map((text, variant) => ({ id: `${group}.${variant}`, group, variant, text })),
);

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;
const values = items.map((i) => `(${quote(i.id)}, ${quote(i.text)})`).join(",\n");
const sql = `with t(id, txt) as (values ${values})
select a.id as a, b.id as b,
       extensions.similarity(public.normalize_match_text(a.txt), public.normalize_match_text(b.txt))::float8 as score
from t a join t b on a.id < b.id;`;

const dir = mkdtempSync(join(tmpdir(), "calibrate-"));
const file = join(dir, "query.sql");
writeFileSync(file, sql);
const out = execFileSync("supabase", ["db", "query", "--linked", "-f", file, "--output-format", "json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
const parsed = JSON.parse(out.slice(out.indexOf("{") === -1 || out.indexOf("[") < out.indexOf("{") ? out.indexOf("[") : out.indexOf("{")));
const rows: { a: string; b: string; score: number }[] = Array.isArray(parsed) ? parsed : (parsed.rows ?? parsed.result ?? parsed.data);

const byId = new Map(items.map((i) => [i.id, i]));
const buckets = { pastedSame: [] as number[], describedSame: [] as number[], different: [] as number[] };
for (const { a, b, score } of rows) {
  const ia = byId.get(a)!, ib = byId.get(b)!;
  if (ia.group !== ib.group) buckets.different.push(score);
  else if (ia.variant < 2 && ib.variant < 2) buckets.pastedSame.push(score);
  else buckets.describedSame.push(score);
}

const stats = (xs: number[]) => {
  const s = [...xs].sort((x, y) => x - y);
  const pct = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(3);
  return `n=${s.length} min=${s[0].toFixed(3)} p50=${pct(0.5)} p90=${pct(0.9)} max=${s[s.length - 1].toFixed(3)}`;
};
console.log("same scam, both pasted:   ", stats(buckets.pastedSame));
console.log("same scam, described:     ", stats(buckets.describedSame));
console.log("different scams:          ", stats(buckets.different));
console.log("\ntop different-scam pairs:");
rows
  .filter((r) => byId.get(r.a)!.group !== byId.get(r.b)!.group)
  .sort((x, y) => y.score - x.score)
  .slice(0, 5)
  .forEach((r) => console.log(`  ${r.score.toFixed(3)}  ${r.a} vs ${r.b}`));
console.log("\nsame-scam pairs (sorted):");
rows
  .filter((r) => byId.get(r.a)!.group === byId.get(r.b)!.group)
  .sort((x, y) => y.score - x.score)
  .forEach((r) => console.log(`  ${r.score.toFixed(3)}  ${r.a} vs ${r.b}`));
