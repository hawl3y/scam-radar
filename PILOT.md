# Scam Radar pilot

Launch as **Scam Radar** at https://scam-radar.joechawley.com. The name is decided only if the pilot continues.

## Launch checklist

- [ ] **Prod data is clean:** no test reports, accounts, or flags left in the prod project.
- [ ] **Admin access:** you're in `public.admins` in prod (README → Trust and safety).
- [ ] **Market settings** in prod (`public.markets`):
  - [ ] Police contact for Next steps:
        `update public.markets set police_contact = '...' where name = 'NY 845';`
  - [ ] Radius covers the area you're recruiting in (default 30 miles from 10989; 845 reaches farther):
        `update public.markets set radius_miles = 45 where name = 'NY 845';`
- [ ] **Legal pages reviewed** by a lawyer: `/terms` (includes 18+), `/privacy`, `/rules`.
- [ ] **Backups:** check what your Supabase plan includes for the prod project (Project Settings → Database → Backups).
- [ ] **Cron jobs** show in Vercel → Settings → Cron Jobs (`/api/cron/ingest` 11:00 UTC, `/api/cron/digest` 12:00 UTC) and the last runs succeeded.
- [ ] **Env vars set in Production:** Supabase keys, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `CRON_SECRET`, `EMAIL_TOKEN_SECRET`, `RATE_LIMIT_SALT`, `FTC_API_KEY`.
- [ ] **Plan limits understood** (below).
- [ ] **Seed 10–20 real local reports** through the normal report form (ideally posted by the neighbors themselves, with their permission), so the feed isn't empty on day one.
- [ ] **Print flyers** from `/flyer` for the library, senior center, and local groups.

## Plan limits

| Service | Free plan limit | What happens | When to upgrade |
|---|---|---|---|
| Resend | 100 emails/day (sign-in emails count) | Alerts stop at `EMAIL_DAILY_BUDGET` (default 90) so sign-in keeps working; you get an email; held-back clusters roll into a later digest | More than ~80 digest users, or the budget email arrives. Then raise `EMAIL_DAILY_BUDGET` in Vercel |
| Vercel Hobby | Non-commercial use; cron jobs run once a day | Fine for a non-commercial pilot | If the project becomes commercial |
| Supabase Free | Database size and monthly active users caps; limited backups | Check the usage page monthly | If backups matter or limits approach |
| api.data.gov | Hourly request limit per key | The daily import retries failed days | Unlikely at one or two area codes |

## Weekly routine

1. Read the **Monday summary email** (metrics + targets).
2. Review **`/admin`** for flagged reports. Remove or dismiss.
3. Check for any **"data import had problems"**, **"digest had failures"**, or **"daily email limit"** emails and act on them.
4. Note anything people tell you in person or by email (Send feedback → `support@` address in `src/lib/site.ts`).

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
