# Local Scam Radar — Project Brief (MVP)

> Working title. This brief is the source of truth for the MVP. Read it fully before planning or writing code. When a decision here conflicts with a default you'd otherwise choose, follow this brief and flag the conflict.

## 1. What we're building

A mobile-friendly web app (PWA) that acts as a **local scam radar**. Residents report suspicious texts, calls, emails, websites, and in-person visits. Neighbors corroborate ("I got this too"), and the app alerts people nearby by email and in-app notices. Public scam data (BBB, FTC) provides a baseline so the feed is useful before local reports build up.

- **Test market:** a single town (the owner's). Design for one area first; don't build multi-region admin tooling.
- **Positioning:** complements the BBB and FTC, doesn't compete with them.
- **Tone:** calm, factual, useful. A radar, not a fear feed.

## 2. Users and core jobs

| User | Core job |
|---|---|
| Resident | "Is this message a scam?" and "What's going around near me?" |
| Reporter | Report a scam in under a minute |
| Neighbor | Confirm "I got this too" |
| Victim | Know who to call and what to do first |
| Admin (owner) | Remove wrong or harmful posts |

## 3. MVP feature set

### Access
- PWA: works in any mobile browser; optional "Add to Home Screen."
- No account needed to browse the feed or use "Check."
- Email magic-link account required to report, corroborate, rate, or receive alerts.
- Setup: zip code or location, alert radius, alert preferences.

### What users see
- **Local feed:** nearby reports, newest first, with distance ("2.3 mi away") and time.
- **Trending near you:** national scams active in the area (public data).
- **Alert cards:** what the scam looks like, report count, what to do.
- **"New near you" notices:** badge and banner on open.
- **Map view:** post-MVP (MVP+).

### What users do
- **Check:** paste a message or describe a call or visit and get a plain-English read based on matching reports and patterns.
- **Report:** short form (type, channel, description, approximate location). Personal info is redacted automatically before saving.
- **Corroborate:** "I got this too."
- **Rate:** helpful / not helpful.
- **Share:** copy a link to an alert to send to family.

### What users get
- **Email alerts:** daily digest by default; instant email when a local cluster crosses a threshold.
- **In-app notices** on open.
- **Optional web push** for home-screen users.
- **Next steps pages:** who to call and what to do first if they've been scammed.

## 4. Trust model (community-rated, no review queue)

- Labels describe the crowd, never a verdict: "Reported by 12 neighbors." Never "Confirmed scam."
- Reputation weighting: established users count more than new accounts.
- Hard rules: no naming private individuals; personal info redacted automatically.
- Flag / takedown path with a simple admin screen. This is occasional removal, not pre-approval.

## 5. Non-goals (do not build)

- Training, courses, quizzes, or general "awareness" content
- Social feed, comments, or chat
- SMS alerts
- Native iOS/Android apps
- Sponsors, payments, or donations
- Small business features
- Multi-region admin tooling

## 6. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router), TypeScript | Front end and API routes in one codebase |
| Hosting / CI | Vercel + GitHub | Preview deploy per branch; production on `main` |
| Database | Supabase Postgres | PostGIS for radius queries; pgvector for similarity |
| Auth | Supabase Auth, email magic link | No passwords |
| Email | Resend or Postmark | Decide in Phase 3 |
| Web push | Web Push API with VAPID keys | Optional channel |
| Scheduled jobs | Vercel Cron | Digests, public data ingestion |
| Matching | Postgres `pg_trgm` text similarity | Clustering and "Check" matching. No AI in the MVP so far; see §11 |
| Styling | Tailwind CSS | Mobile-first |

**Language policy:** TypeScript everywhere for the MVP. Python may be added later only for a clear need (e.g., data ingestion); don't introduce it without asking.

**Environments:** separate Supabase projects for dev and prod. Secrets in Vercel environment variables and a local `.env.local` (never committed).

**Dev setup:** owner works on a MacBook Pro (VS Code + Claude Code). Keep setup reproducible: document every step in `README.md`, pin Node version (`.nvmrc`), use the Supabase CLI for migrations.

## 7. Data model (starting sketch — refine in Phase 0/1)

- **profiles:** id (auth user), email, home_zip, home_point (approximate, geography), radius_miles, alert_mode (`digest` | `instant` | `off`), reputation, created_at
- **reports:** id, user_id, scam_type, channel (`text` | `call` | `email` | `website` | `visit` | `other`), description_redacted, point (approximate, geography), zip, cluster_id, embedding (vector), status (`active` | `removed`), created_at
- **clusters:** id, title, summary, report_count, corroboration_count, centroid (geography), first_seen, last_seen
- **corroborations:** user_id, cluster_id, created_at (unique per user + cluster)
- **ratings:** user_id, report_id, helpful (bool), created_at (unique per user + report)
- **flags:** id, report_id, user_id, reason, status, created_at
- **push_subscriptions:** user_id, endpoint, keys, created_at
- **alerts_sent:** user_id, cluster_id, channel, sent_at (dedupe and throttling)
- **public_scams:** id, source, title, summary, region, published_at, url

### Privacy rules (non-negotiable)
- Never store raw, unredacted report text. Redact before insert.
- Never store exact addresses. Snap locations to an approximate grid or zip centroid.
- Never show reporter identity publicly.
- Use Supabase row-level security on every table.

## 8. Build phases

Each phase ends with a working deploy. Don't start the next phase until the "Done when" criteria pass.

### Phase 0 — Foundation
- Repo, Vercel connection, preview deploys.
- Supabase dev and prod projects; enable PostGIS and pgvector; migrations via Supabase CLI.
- Next.js PWA scaffold: manifest, service worker, installable.
- Magic-link login; profile setup (zip, radius).
- `README.md` with full local setup.
- **Done when:** PWA deployed, login works, profile saves, database connected in dev and prod.

### Phase 1 — Report and feed
- Report form with validation.
- Redaction step (phone numbers, emails, names, account/card numbers, street addresses) before saving. Unit tests for redaction.
- Approximate location handling.
- Local feed by radius with distance and time; alert card view.
- **Done when:** a user reports a scam and a second test user within the radius sees it, redacted, with correct distance.

### Phase 2 — Check and corroborate
- Text similarity on reports with Postgres `pg_trgm` (no AI). Matching sits behind database functions so embeddings can replace it later (§11).
- "Check": paste text, return matching local clusters with fixed plain-English guidance and tips. Never claim certainty. Per-IP rate limit.
- Clustering: new reports join an existing cluster when similar enough.
- "I got this too" with counts on cards.
- **Done when:** a pasted message finds the matching cluster, and corroboration counts update correctly.

### Phase 3 — Alerts
- Alert preferences UI.
- Daily digest via Vercel Cron.
- Instant email when a local cluster crosses a configurable threshold.
- Throttling and dedupe via `alerts_sent`.
- "New near you" badge and banner.
- Optional web push for home-screen users.
- SPF, DKIM, DMARC configured on the sending domain.
- Emails link to the alert in the app and never ask users to log in from the email.
- **Done when:** test users receive correct digests and instant alerts in the inbox (not spam), with no duplicates.

### Phase 4 — Trust and safety
- Reputation scoring (account age, corroborated reports, helpful ratings).
- Helpful / not-helpful ratings.
- Flagging and an admin takedown screen (owner-only role).
- Rate limiting on report, check, and corroborate endpoints.
- Terms of use, privacy policy, and community rules pages.
- **Done when:** flagged posts can be removed, low-reputation spam doesn't surface, and rate limits hold.

### Phase 5 — Trending near you
- **First:** confirm what BBB and FTC data can legally be used. Don't scrape without confirming terms.
- Ingestion job via Vercel Cron into `public_scams`.
- "Trending near you" section.
- "Next steps" pages (bank, local police, FTC ReportFraud, BBB Scam Tracker, IC3).
- **Done when:** a new user in the test town sees a useful feed with zero local reports.

> Phase 5 may move before Phase 3 if an empty feed hurts first impressions.

### Phase 6 — Pilot launch
- Seed 10–20 real local reports.
- Recruit early users (local groups, library, senior center, neighbors).
- Privacy-respecting analytics: sign-ups, reports per week, corroboration rate, email opens, return visits.
- **Done when:** 4–8 weeks of real usage data to decide whether to continue, adjust, or stop.

## 9. Engineering conventions

- Small PRs, one feature per branch; verify on the preview deploy before merging to `main`.
- Database changes only through migrations.
- Unit tests for redaction, clustering thresholds, reputation scoring, and alert throttling.
- Accessibility: large tap targets, readable fonts, high contrast. Many users will be older.
- Plain-English UI copy. No jargon, no fear language.
- Treat all user-submitted text as untrusted (sanitize output; never pass it as instructions to an LLM without clear separation).

## 10. Open questions

- App name and domain
- Email provider (Resend vs. Postmark)
- Clustering similarity threshold and instant-alert threshold
- Default alert radius
- Location granularity (grid size vs. zip centroid)
- BBB / FTC data access terms
- Reputation formula details

## 11. Future options

- **AI redaction, embeddings, and generated "Check" answers**, if `pg_trgm` matching proves weak (e.g. paraphrased reports of the same scam don't cluster, or Check misses obvious matches). Only rules-redacted text would be sent to an AI provider.
