// Verifies hit_rate_limit blocks the call after the limit, on the linked (dev) project.
// Usage: node scripts/check-rate-limit.mts
// Uses a throwaway key and deletes it afterwards.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const key = `selftest:${randomUUID()}`;
const limit = 5;
const sql = `
with hits as (
  select i, public.hit_rate_limit('${key}', ${limit}, 3600) as allowed
  from generate_series(1, ${limit + 1}) as i
)
select json_agg(allowed order by i) as allowed from hits;
`;
const cleanup = `delete from public.rate_limits where key = '${key}';`;

const run = (query: string) =>
  execFileSync("supabase", ["db", "query", "--linked", query, "--output-format", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

try {
  const out = run(sql);
  const allowed: boolean[] = JSON.parse(out.slice(out.indexOf("{"))).rows[0].allowed;
  const expected = [...Array(limit).fill(true), false];
  const ok = JSON.stringify(allowed) === JSON.stringify(expected);
  console.log(`hits 1..${limit + 1}:`, allowed.join(", "));
  console.log(ok ? "PASS: blocked after the limit" : "FAIL: unexpected result");
  process.exitCode = ok ? 0 : 1;
} finally {
  run(cleanup);
}
