# Tech debt

Shortcuts we took on purpose, with a plan to fix them. Keep this list short.

| # | Shortcut | Why it's OK for now | Plan |
|---|---|---|---|
| 1 | Expired participant sessions are never deleted from `sessions`. | Sessions last 1 year; about 60 users → a few hundred small rows a year. Expired rows are ignored on every request. | v1.1: delete expired rows when someone logs in (one `DELETE … WHERE expires_at <= ?`). |
| 2 | `auth_failures.locked_until` is unused: a key is blocked while it has ≥ limit failures in its 15-minute window (per IP, and the organizer key `org`). | Same effect, simpler code. The column costs nothing. | Drop it in the next migration that touches `auth_failures`. |
| 3 | The seed script writes values into SQL text (escaped with `sqlText`), because `wrangler d1 execute` can't bind parameters. | Only the developer runs it; input is validated first; tested with quotes. The Worker always uses `.prepare().bind()`. | Kept as a fallback (plan cut list 4). Delete it if it isn't used for a while. |
| 4 | `package.json` `overrides` force patched `undici` 7.30.1, `zod` 4.6.7 and `serialize-javascript` 7.1.3 (high advisories, 24.10.2026). Cloudflare's miniflare and vitest-plugin pin the old versions exactly. | Dev and build tools only: the shipped app (`hono`, `preact`, `@preact/signals`) had 0 advisories. Patch versions in the same minor; all tests pass. | When wrangler / vitest-plugin ship the fixed versions, update them and delete `overrides`. |
