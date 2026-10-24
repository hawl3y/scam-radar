# ByeBell pilot

The app is **ByeBell** ("Ring the bell on scams"; formerly the working title Scam Radar). It's moving from scam-radar.joechawley.com to **byebell.com**; follow the rename checklist below, then reprint flyers.

Status: Phases 0–6 are merged and live. Work through the launch checklist and open follow-ups, then start recruiting.

**Latest (Oct 24):** unwanted-call trends are now state-correct. Markets match only zips in their own state (fixes NJ zips like 07430 showing NY data), **NJ Bergen** (201/551) was added, and every other state gets state-level trends. FTC ingest is paced to stay under the API's burst throttle and runs every 15 minutes on weekday afternoons via GitHub Actions, with the Vercel cron as backup. A daily coverage check emails you if trend data falls behind.

## Launch checklist

- [ ] **Prod data is clean:** no test reports, accounts, or flags left in the prod project.
- [ ] **Admin access:** you're in `public.admins` in prod (README → Trust and safety). Flag emails and `/admin` depend on it.
- [ ] **Market settings** in prod (`public.markets`): **NY 845** (center 10989, 30 miles) and **NJ Bergen** (201 and 551, center 07601, 18 miles). Police contact and radius: see Open follow-ups.
- [ ] **Legal pages reviewed** (see Open follow-ups).
- [ ] **Cron jobs** show in Vercel → Settings → Cron Jobs (`/api/cron/ingest` 18:00 UTC backup, `/api/cron/digest` 12:00 UTC), and the last runs succeeded.
- [x] **GitHub Actions ingest schedule:** repo secret `PROD_CRON_SECRET` is set (Settings → Secrets and variables → Actions), and a manual run of **Ingest FTC data** succeeded. Scheduled runs: every 15 minutes, 17:00–20:45 UTC, Mon–Fri.
- [ ] **Env vars set in Production:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `CRON_SECRET`, `EMAIL_TOKEN_SECRET`, `RATE_LIMIT_SALT`, `FTC_API_KEY`. Optional: `EMAIL_DAILY_BUDGET` (default 90), `ALERT_INSTANT_THRESHOLD` (default 3).
- [ ] **Plan limits understood** (below).
- [ ] **Seed 10–20 real local reports** through the normal report form (ideally posted by the neighbors themselves, with their permission), so the feed isn't empty on day one.
- [ ] **Print flyers** from `/flyer` (one US Letter page; the QR code always points to the production URL).

## Open follow-ups

- [ ] **Lawyer review** of `/terms` (includes 18+), `/privacy`, and `/rules` before recruiting beyond friends and neighbors.
- [ ] **Police contact** for Next steps, per market (currently "your local police non-emergency line"):
      `update public.markets set police_contact = 'the … Police non-emergency line at (…) …' where name = 'NY 845';` (and `'NJ Bergen'`)
- [ ] **Radius decision:** the NY 845 market covers 30 miles from 10989, but area code 845 reaches farther (e.g. Middletown, Poughkeepsie). To cover more of it:
      `update public.markets set radius_miles = 45 where name = 'NY 845';`
- [ ] **Supabase inactivity pauses:** free-plan projects pause after about a week of low activity. Prod should stay active (the daily cron jobs query it), but the **dev** project can pause between work sessions, and previews then fail until it's restored. Restore from the Supabase dashboard, or upgrade if pauses become a problem.
- [ ] **FTC data coverage:** state trends build up from the first ingest (no backfill), so most states show "N days of data so far" for the first week and comparisons after two. The API's burst throttle (~100 requests per run from Vercel) is why ingest runs every 15 minutes on weekday afternoons.
- [ ] **GitHub pauses scheduled workflows** in public repos after 60 days without repository activity (it emails a warning). If that happens, re-enable **Ingest FTC data** under Actions; the Vercel cron keeps NY/NJ covered meanwhile.
- [ ] **Resend free-tier limit:** 100 emails a day including sign-in emails. Alerts stop at `EMAIL_DAILY_BUDGET` (90) and you get a "daily email limit" email. If that happens, or digest users pass ~80, upgrade Resend and raise `EMAIL_DAILY_BUDGET` in Vercel.

## Plan limits

| Service | Free plan limit | What happens | When to upgrade |
|---|---|---|---|
| Resend | 100 emails/day (sign-in emails count) | Alerts stop at `EMAIL_DAILY_BUDGET` (default 90) so sign-in keeps working; you get an email; held-back clusters roll into a later digest | More than ~80 digest users, or the budget email arrives. Then raise `EMAIL_DAILY_BUDGET` |
| Vercel Hobby | Non-commercial use; cron jobs run once a day | Fine for a non-commercial pilot | If the project becomes commercial |
| Supabase Free | Database size and monthly active user caps; limited backups; pauses after inactivity | Check the usage page monthly | If backups matter, limits approach, or pauses recur |
| api.data.gov / FTC API | 20,000 requests/hour per key, plus a stricter burst throttle (~100 requests per run from Vercel; recovers in ~10 minutes) | Runs stop on a 429 and keep completed days; the next 15-minute run continues; the daily coverage check emails if data falls behind | Request a higher limit at api.data.gov if coverage stays low (the burst throttle may not be key-based) |
| GitHub Actions | Free for public repos (private: 2,000 min/month on Free) | The ingest schedule uses at most ~1,760 billed min/month if the repo were private; typically far less | Only if the repo goes private and usage approaches the limit |

## Weekly routine

1. Read the **Monday summary email** (last week's numbers and the targets), or open `/admin/metrics`.
2. Review **`/admin`** for flagged reports and reports from limited accounts. Remove, dismiss, or restore.
3. Act on any **"data import had problems"**, **"trend data is behind"**, **"digest had failures"**, or **"daily email limit"** emails. For trend problems, check GitHub → Actions → **Ingest FTC data** run logs (each shows the JSON result) and the Vercel cron logs.
4. Note feedback from people in person or by email (footer "Send feedback" goes to `SUPPORT_EMAIL` in `src/lib/site.ts`).

## Success criteria (weeks 4–8)

Shown on `/admin/metrics` and in the weekly email. Defined in `src/lib/pilot.ts`.

| Measure | Target |
|---|---|
| Sign-ups in the test area | 50+ |
| New reports per week | 5+ by week 4 |
| Alerts with at least one "I got this too" | 30%+ |
| Users who come back in a later week | 40%+ |
| Turned off emails | under 10% |

After 4–8 weeks, decide: **continue** (most targets met), **adjust** (some met; change outreach, alerts, or matching, e.g. the AI options in brief §11), or **stop**.

## Rename / new domain checklist

**In progress: ByeBell at byebell.com.** The name is done in code (display name, logo, icons). The domain steps below are next.

Use this for any future rename or domain change too. Keep the old domain working during the switch: printed flyers, emailed alert links, and unsubscribe links all point to it.

**1. Code** (one file, then a PR)
- [ ] `src/lib/site.ts`: `SITE_NAME`, `PUBLIC_SITE_URL`, `ALERTS_FROM_EMAIL`, and `SUPPORT_EMAIL` if it changes. Page titles, the manifest, emails, legal pages, the flyer, and admin email subjects all read from here.
- [ ] `supabase/templates/sign-in.html`: the name in the heading and the subject comment (then re-paste it in Supabase; step 4).
- [ ] App icons if the logo changes: `public/icon-192.png`, `public/icon-512.png`, `public/icon-512-maskable.png`, `src/app/icon.png`, `src/app/apple-icon.png`.
- [ ] Docs: `README.md`, `CLAUDE.md`, `PROJECT_BRIEF.md`, this file, and the comment in `.env.example`.
- [ ] Optional, cosmetic: `package.json` `name`, `supabase/config.toml` `project_id`, the IC3 `User-Agent` in `src/lib/trending/ingest.ts`. Leave the `scam-radar:last-feed-visit` storage key in `src/components/feed-list.tsx` alone; changing it resets everyone's "new" labels.

**2. Domain** (registrar/DNS, Vercel)
- [ ] Vercel → Settings → Domains: add the new domain to **Production** and create the DNS record Vercel shows.
- [ ] Keep the old domain attached and set it to **redirect** to the new one. Keep it for at least a year.

**3. Sending email** (Resend and DNS)
- [ ] Resend: add and verify the new sending domain (its SPF and DKIM records).
- [ ] DNS: add a DMARC record for the new domain (e.g. `_dmarc.<new>`: `v=DMARC1; p=none;`).
- [ ] Create new Resend API keys for the new domain (Preview and Production) and update `RESEND_API_KEY` in Vercel.

**4. Supabase** (dev and prod)
- [ ] Authentication → URL Configuration: **Site URL** and **Redirect URLs** to the new domain (keep the old one during the switch).
- [ ] Authentication → Emails → SMTP Settings: sender email (e.g. `no-reply@<new>`) and sender name.
- [ ] Authentication → Emails → Templates: re-paste `sign-in.html` into **Magic Link** and **Confirm signup**, and update the subject.

**5. Vercel environment**
- [ ] `NEXT_PUBLIC_SITE_URL` (Production) to the new URL; redeploy.
- [ ] Keep `EMAIL_TOKEN_SECRET` unchanged so email preference and unsubscribe links in past emails stay valid (via the old-domain redirect).

**6. People and materials**
- [ ] Sign-ins are per domain, so users have to sign in again on the new domain. Say so in the next digest or on the home page.
- [ ] Reprint flyers from `/flyer` (the QR code follows `PUBLIC_SITE_URL`).
- [ ] Optional: rename the GitHub repo (then update the link in `CLAUDE.md`) and the Supabase/Vercel project names.

**7. Verify on production**
- [ ] A sign-in email arrives from the new sender, and its link opens the new domain.
- [ ] An alert email shows the new name in "From", its links use the new domain, and SPF, DKIM, and DMARC pass (Gmail → Show original).
- [ ] An old-domain link (e.g. an old alert email) redirects to the same page on the new domain.
- [ ] The flyer QR code scans to the new domain, and a shared alert link previews with the new name.
