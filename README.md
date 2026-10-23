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
   Fill in the **dev** project's URL and publishable key (Supabase Dashboard → Project Settings → API Keys).
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
  - **Production:** prod project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - **Preview** and **Development:** the dev project's values
- Every branch push gets a preview deploy; `main` deploys to production at https://scam-radar.joechawley.com (DNS: CNAME at DreamHost).
- Preview deploys are behind Vercel Authentication (Deployment Protection). Sign in to Vercel to view them, including on a phone.

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
