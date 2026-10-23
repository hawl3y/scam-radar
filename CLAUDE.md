# CLAUDE.md — scam-radar

## Start here
1. Read `PROJECT_BRIEF.md` fully before planning or writing code. It is the source of truth.
2. Work **one phase at a time** (see brief §8). Don't start a phase until the previous phase's "Done when" criteria pass.
3. Before writing code for a phase, propose a short plan and wait for approval.

## Rules
- Stay within the MVP scope. Anything in the brief's Non-goals (§5) is out unless the owner says otherwise.
- TypeScript only. Don't add Python or other languages without asking.
- Privacy rules in the brief (§7) are non-negotiable: redact before saving, approximate locations only, row-level security on every table.
- Never commit secrets. Use `.env.local` locally and Vercel environment variables for deploys.
- Database changes only through Supabase migrations.
- Small, focused commits on a feature branch; the owner merges to `main` after checking the Vercel preview.
- Keep `README.md` setup steps current whenever setup changes.
- When something in the brief is unclear or conflicts with best practice, ask instead of guessing.

## Environment
- Owner develops on macOS (VS Code + Claude Code) and sometimes on an Ubuntu server over SSH. Keep setup reproducible on both.
- GitHub: https://github.com/hawl3y/scam-radar
- Hosting: Vercel (connected after Phase 0 scaffolding).
