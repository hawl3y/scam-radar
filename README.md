# Scam Radar

A mobile-friendly web app (PWA) where neighbors report and confirm local scams. See `PROJECT_BRIEF.md` for scope.

Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS, Supabase (Postgres + PostGIS + pgvector, Auth), Vercel.

## Local setup (macOS)

1. **Node:** install [nvm](https://github.com/nvm-sh/nvm), then from the repo root:
   ```sh
   nvm install   # reads .nvmrc (Node 24)
   nvm use
   ```
2. **Supabase CLI:**
   ```sh
   brew install supabase/tap/supabase
   supabase login
   ```
3. **Dependencies:**
   ```sh
   npm install
   ```
4. **Environment:**
   ```sh
   cp .env.example .env.local
   ```
   Fill in the **dev** project's URL, publishable key, and secret key (Supabase Dashboard → Project Settings → API Keys). Set `RATE_LIMIT_SALT`, `CRON_SECRET`, and `EMAIL_TOKEN_SECRET` to random strings (`openssl rand -hex 32`), and add a `RESEND_API_KEY` (see [Alerts](#alerts-email)).
5. **Database:** link the dev project and apply migrations:
   ```sh
   supabase link --project-ref <dev-project-ref>
   supabase db push
   ```
6. **Run:**
   ```sh
   npm run dev
   ```
   Open http://localhost:3000.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm test` | Unit tests (Vitest) |

## Supabase projects

Two hosted projects: `scam-radar-dev` and `scam-radar-prod`. No local Docker database.

Zip code centers (`zip_centroids`) come from the US Census Bureau [Gazetteer files](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html) (2025 ZCTA, public domain) and are loaded by a migration.

### Matching (clusters and Check)
Text similarity uses Postgres `pg_trgm` behind database functions (`nearest_cluster_candidate`, `match_clusters`). Thresholds live in `src/lib/matching.ts`. To re-tune them, run `node scripts/calibrate-matching.mts` (read-only, uses the linked dev project) and update the numbers and the comment there.

Don't use `supabase migration new` from a script or agent; it waits for SQL on stdin. Create `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` by hand instead.

### Database changes
Only through migrations:
```sh
supabase migration new <name>      # creates supabase/migrations/<timestamp>_<name>.sql
supabase db push                   # applies to the currently linked project
```
Keep the CLI linked to **dev**. Prod gets migrations automatically from the `Migrate prod database` workflow when they merge to `main`. Never push to prod by hand.

Migrations must work with the code already in production (add columns/tables; rename or drop only in a later change), because the prod migration and the Vercel production deploy run at the same time.

### Auth settings (do this in each project's dashboard)
- **Authentication → Sign In / Providers → Email:** enabled. Leave "Confirm email" on.
- **Authentication → URL Configuration:**
  - Site URL: `http://localhost:3000` (dev) or `https://scam-radar.joechawley.com` (prod).
  - Redirect URLs:
    - dev: `http://localhost:3000/**` and `https://scam-radar-*-hawleys-projects.vercel.app/**` (preview deploys)
    - prod: `https://scam-radar.joechawley.com/**`
- **Authentication → Emails → SMTP Settings:** custom SMTP via [Resend](https://resend.com).
  - Host `smtp.resend.com`, port `465`, username `resend`, password: a Resend API key.
  - Sender: `no-reply@scam-radar.joechawley.com` (domain verified in Resend).
- **Authentication → Emails → Templates:** paste `supabase/templates/sign-in.html` into both **Magic Link** and **Confirm signup** (subject: `Your Scam Radar sign-in link`). Custom templates require custom SMTP.

The email has a link (to `/auth/confirm?token_hash=…`, works in any browser) and a sign-in code. The code is for people using the app from their iPhone home screen, which doesn't share sign-ins with Safari. The code entry is controlled by `SIGN_IN_CODE_ENABLED` in `src/app/login/login-form.tsx`; it must stay in sync with the template.

## Deploys (Vercel)

- Import the GitHub repo in Vercel (framework: Next.js; defaults are fine).
- Environment variables (Project Settings → Environment Variables):
  - **Production:** prod project's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`; `NEXT_PUBLIC_SITE_URL=https://scam-radar.joechawley.com`; plus its own `RATE_LIMIT_SALT`, `CRON_SECRET`, `EMAIL_TOKEN_SECRET`, and `RESEND_API_KEY`
  - **Preview:** the dev project's values; `NEXT_PUBLIC_SITE_URL=https://scam-radar-git-<branch>-hawleys-projects.vercel.app` is fine for testing (links in preview emails need Vercel sign-in); different random secrets
  - Mark every secret (`SUPABASE_SECRET_KEY`, `RATE_LIMIT_SALT`, `CRON_SECRET`, `EMAIL_TOKEN_SECRET`, `RESEND_API_KEY`) as **Sensitive**.
- Every branch push gets a preview deploy; `main` deploys to production at https://scam-radar.joechawley.com (DNS: CNAME at DreamHost).
- Preview deploys are behind Vercel Authentication (Deployment Protection). Sign in to Vercel to view them, including on a phone.

## Alerts (email)

- **Sending:** [Resend](https://resend.com) API, from `alerts@scam-radar.joechawley.com`. Create an API key with **Sending access** for the domain; use separate keys for Preview and Production. SPF and DKIM come from the Resend domain verification; DMARC is a TXT record at DreamHost (`_dmarc.scam-radar`, `v=DMARC1; p=none;`).
- **Instant alerts:** sent right after a report or "I got this too" pushes a cluster to `ALERT_INSTANT_THRESHOLD` (default 3), to users in **instant** mode within their radius. Max 3 per person per day.
- **Daily digest:** Vercel Cron calls `/api/cron/digest` at 12:00 UTC (8 am Eastern in summer, 7 am in winter). Crons only run on production. To run it on a preview:
  ```sh
  curl -H "Authorization: Bearer $CRON_SECRET" https://<preview-url>/api/cron/digest
  ```
  Previews are behind Vercel Authentication, so run that from a browser session or add a [protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) header. Re-running sends nothing new: one digest per person per Eastern day.
- **No duplicates:** each email is recorded in `alerts_sent` before it's sent and released if sending fails.
- **Unsubscribe:** every email has one-click unsubscribe headers and a signed link to `/email-preferences` that works without signing in.

## Making changes

1. Branch from `main`: `git checkout -b <feature>`.
2. If the change includes a migration, apply it to dev: `supabase db push` (CLI linked to dev).
3. Push the branch and open a pull request. This runs:
   - **CI** (GitHub Actions): lint, typecheck, unit tests.
   - **Vercel preview** using the dev database.
4. Test on the preview. When CI is green, merge the PR.
5. Merging to `main`:
   - Vercel deploys production.
   - If `supabase/migrations/` changed, the **Migrate prod database** workflow applies them to prod. Check it passed under the repo's **Actions** tab.

### One-time GitHub setup
- **Settings → Secrets and variables → Actions → New repository secret:**
  - `SUPABASE_PROD_DB_URL`: prod project → **Connect** → **Session pooler** connection string (port `5432`), with `[YOUR-PASSWORD]` replaced by the prod database password. Percent-encode special characters in the password (e.g. `@` → `%40`, `#` → `%23`, `/` → `%2F`). Don't use the direct connection string; GitHub runners can't reach it (IPv6 only).
- **Settings → General → Pull Requests:** turn on **Automatically delete head branches**.
- **Settings → Rules → Rulesets → New branch ruleset** for `main`:
  - Require a pull request before merging.
  - Require status checks to pass: `checks`.
  - Block force pushes.
