# hatm

A website for a group hatm al-Quran: 30 juz shared among participants. Kazakh (Cyrillic) only.
Phone-first PWA. Runs on Cloudflare Workers + D1 (free plan).

Portfolio copy of a real project (v1.0.0, live with real users). Project docs: [`docs/`](docs/) (requirements, design, plan). License: MIT.

## Requirements

- **Node.js 24 LTS** (see `.nvmrc`). It ships npm 11, which this project needs (npm 10 crashes on install).
  Node runs the TypeScript scripts in `scripts/` directly.
- A Cloudflare account, only for deploying (not for local development).

## First-time setup

```sh
npm install                      # also runs `wrangler types` (generates worker-configuration.d.ts)
cp .dev.vars.example .dev.vars   # then fill in local-only values (see the comments in the file)
npm run db:migrate:local         # creates the local D1 database
```

**Install scripts:** npm 11 only runs install scripts of packages listed in `allowScripts` in
`package.json`. If `npm install` warns about a new one, check what it is, then run
`npm install-scripts approve <package>` (or `deny`).

## Everyday commands

| Command                    | What it does                                                           |
| -------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`              | Runs the site and the API locally at http://localhost:5173             |
| `npm test`                 | Runs all tests inside the real Workers runtime with a local D1         |
| `npm run check`            | Lint + format check + type check + tests (run before every PR)         |
| `npm run format`           | Formats all files with Prettier                                        |
| `npm run build`            | Production build into `dist/`                                          |
| `npm run size`             | Checks the JS bundle size budget (after a build)                       |
| `npm run check:unicode`    | Fails on invisible or bidirectional Unicode characters (Trojan Source) |
| `npm run db:migrate:local` | Applies new files in `migrations/` to the local database               |

## Workflow

GitHub Flow: branch `feat/<task-id>-<name>` → pull request → CI green → review → squash-merge to `main`.
Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

CI (`.github/workflows/ci.yml`) runs on every pull request: lint, format, type check, tests,
`npm audit`, build + bundle size, gitleaks (secret scan) and Semgrep (static security analysis).
**Merge only when CI is green.**

## Deploy

| Environment | URL                                   | Worker         | Database                        |
| ----------- | ------------------------------------- | -------------- | ------------------------------- |
| staging     | https://hatm-staging.hatm.workers.dev | `hatm-staging` | D1 `hatm-staging`               |
| production  | https://app.hatm.workers.dev          | `app`          | D1 `hatm-prod` (set up in T3.7) |

You need to be logged in once: `npx wrangler login` (check with `npx wrangler whoami`).

**Deploy to staging:**

```sh
npm run check                 # everything must be green first
npm run db:migrate:staging    # only if there is a new file in migrations/ (always before deploying)
npm run deploy:staging        # builds with CLOUDFLARE_ENV=staging, then uploads
```

Then open the URL and check that the page loads. `curl -I <url>` shows the security headers.

**Secrets** (one time per environment; run in your own terminal, never paste values into chats):

```sh
openssl rand -base64 32                          # new value → save it in the password manager first
npx wrangler secret put PEPPER --env staging     # paste the value at the prompt
npx wrangler secret list --env staging           # shows names only, never values
```

**Create a khatm from the terminal** (the organizer normally uses «Жаңа хатм құру» at `/org`). Put the names in a text file,
one per line, in juz order (line 1 reads juz 1). The script checks them with the same rules as the app
and prints the group link:

```sh
npm run seed -- --env staging --title "Жұма хатмы — 1-топ" --duration 7 --names names.txt
# --env local | staging | production   --start YYYY-MM-DD (default: today in Kazakhstan)
```

Run it **once**: each run creates a new khatm with a new link.

**Organizer login** (one time per environment, and whenever the password changes):

```sh
npm run hash-password                                          # asks for the PEPPER and the password (hidden)
npx wrangler secret put ORGANIZER_USERNAME --env staging       # type the username
npx wrangler secret put ORGANIZER_PASSWORD_HASH --env staging  # paste the hash
```

The organizer opens `/org` (e.g. https://hatm-staging.hatm.workers.dev/org). For local development,
put both values in `.dev.vars`, with the hash in single quotes (it contains `$`).

Copy the **whole** hash line (triple-click it): it starts with `pbkdf2$sha256$10000$` and is about
90 characters long. A double-click selects only part of it. If the right password is refused and
`npx wrangler tail` shows `ORGANIZER_PASSWORD_HASH is malformed`, the stored hash is cut or has
extra characters: run both steps again.

**Logs:** `npx wrangler tail hatm-staging` streams live requests (with CPU time). Stop with Ctrl+C.

**Production** (https://app.hatm.workers.dev, real users). Deploy only a commit that passed
staging and UAT; production has its own database (`hatm-prod`) and its own secrets
(a **different** `PEPPER`):

```sh
git switch main && git pull     # the exact commit that was tested on staging
npm run check
npm run db:migrate:prod         # only if there is a new file in migrations/
npm run deploy:prod
```

Then open https://app.hatm.workers.dev/org and check that the organizer can log in.

**Undo a bad production deploy:** `npx wrangler rollback --env production` (goes back to the
previous version of the Worker; the database is not changed).

**Restore the database** to any minute in the last 7 days (D1 Time Travel):
`npx wrangler d1 time-travel restore hatm-prod --env production --timestamp=<ISO time>`.

## Secrets — read this

- Secrets are never in code or git: `.dev.vars` locally (gitignored), `wrangler secret put` on Cloudflare.
- **`PEPPER` must be backed up in your password manager.** If it is lost, every PIN and the
  organizer password stop working. Recovery: set a new pepper → make a new organizer password hash →
  the organizer resets every participant's PIN. Staging and production have **different** peppers.
