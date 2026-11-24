# 03 — Plan (v1, launch 23.10.2026)

Status: **Approved 21.10.2026** · Phase 2 of 5 · Design: `02-design.md`

**Rules:**
- Each task is ≤ ½ day, links to a story, and must pass the Definition of Ready / Done (`01-requirements.md` §7–8).
- Each iteration ends with something working on **staging** that we can show the client.
- The participant's main flow («Оқыдым») comes first.

---

## Iteration 0 — Setup (21.10)
| ID | Task | Story / ref | Done when |
|---|---|---|---|
| T0.1 | Scaffold: Vite + Preact + Signals + Hono + @cloudflare/vite-plugin, TS strict, ESLint, Prettier, Vitest (workers pool), `.gitignore`, `.dev.vars.example`, README skeleton | design §A, §L | `npm run dev`, `lint`, `test` all work |
| T0.2 | CI: lint, typecheck, tests, `npm audit`, gitleaks, Semgrep CE, bundle size, Unicode check (no invisible / bidirectional characters; added 21.10) | §L | green on a test PR |
| T0.3 | `migrations/0001_init.sql`: all tables, constraints, append-only triggers | §C, S-1 | test: UPDATE/DELETE on `change_log` fails |
| T0.4 | `src/shared/`: juz pages (BR-1), dates & days left (BR-3/4/5), progress (BR-6), name parsing + validation | BR-1…BR-6, O-7 | unit tests for every rule and boundary (juz 1/2/29/30, deadline day, 0/30/31 names, duplicates, 40/41 chars) |
| T0.5 | `auth/hash.ts` (PBKDF2 + pepper + salt + `timingSafeEqual`) and the **CPU measurement on staging**. Write the numbers + the final ITERATIONS into design §G, then delete the endpoint. | §G | table in §G filled in; unit tests pass |
| T0.6 | Cloudflare account with 2FA, staging Worker + D1, secrets (`PEPPER` backed up in the password manager), first deploy | §M | the empty app opens on staging |

**Demo:** the empty app on the staging URL; CI is green.

**Screens:** the developer gives the screen mockups (screenshots) at the start of Phase 3. They are the visual target for every UI task. The frontend-design plugin may polish but must not change the layout, colours or texts (design §J).

## Iteration 1 — Participant «Оқыдым» flow (21.10 → 22.10 morning)
| ID | Task | Story | Done when |
|---|---|---|---|
| T1.1 | `scripts/seed-khatm.ts`: creates a khatm from a names file (local / staging / prod) | O-7 (fallback) | a test khatm exists on staging |
| T1.2 | API #1 + name list screen + «Сілтеме қате» | P-1 | bad token → 404, same body |
| T1.3 | API #2: PIN create / check, sessions, per-name + per-IP limits, 409 on PIN race | P-1, §E, §F | API tests: wrong PIN, 5 fails → 429, lock ends, race |
| T1.4 | API #3 + Home screen (juz card, days left, progress X/30, list of 30, «Бос», «Мерзімі өтті», «Хатм аяқталды») | P-2, P-5 | data matches the business rules; 320 px ok |
| T1.5 | API #4 + «Оқыдым», Undo 15 s, remove mark with dialog. Button disabled while waiting; on failure the old state stays and "Интернет жоқ. Қайталап көріңіз." is shown | P-3, P-4, BR-7/8/9, design §K | API tests: other person's seat → 403, double request → same state, log rows |
| T1.6 | Refresh: `visibilitychange`, «Жаңарту», pull-to-refresh, loading state | P-5 | works when switching back from WhatsApp |
| T1.7 | API #5 + «Мен емеспін» (confirm) | P-7 | session row deleted, name list shown |
| T1.8 | Security middleware: headers (§I), Origin check, JSON only, 10 KB limit. **Check CSP on staging:** `curl -I` + 0 CSP errors in the console (iPhone, Android, desktop), and the progress bar's dynamic `style` width works on a real iPhone (Safari) | §D, §I | tests for 403/413/415; headers present |
| T1.9 | Real-iPhone check of the per-group manifest (`start_url`) | §H | the installed app opens the right group, or the fallback is chosen |

**Demo:** a participant opens the link, creates a PIN, marks their juz, undoes it, and sees the group progress.

## Iteration 2 — Organizer (22.10 morning)
| ID | Task | Story | Done when |
|---|---|---|---|
| T2.1 | API #6/#7 + login screen, 5-fail lock, logout | O-1 | API tests: same error for wrong user/password, lock |
| T2.2 | API #8 + groups screen | O-2 | |
| T2.3 | API #9 + group detail, "only unread" filter, copy link (+ fallback: selected text) | O-3, O-5 | |
| T2.4 | API #10 + mark / unmark on behalf (confirm for unmark), also «Бос» | O-4 | logged as organizer |
| T2.5 | API #11 + PIN reset (confirm) | O-6 | sessions deleted, lock cleared, logged |
| T2.6 | API #12 + create khatm form with preview and line-numbered errors | O-7 | API tests for every validation rule |

**Demo:** the organizer logs in, creates a khatm, copies the link, marks a juz for someone, and resets a PIN.

## Iteration 3 — PWA, polish, production ready (22.10, before UAT)
| ID | Task | Story | Done when |
|---|---|---|---|
| T3.1 | Manifest (API #13), icons, service worker (`injectRegister: false`) | P-6, §H | installable on Android + iPhone |
| T3.2 | Offline: last data from localStorage, read-only, banner | decision 11 | airplane mode test |
| T3.3 | Install help (iPhone note: **"PIN-ді тағы бір рет енгізесіз"**; Android button/steps; hidden when installed) | P-6 | |
| T3.4 | Accessibility pass against the checklist | §5 checklist | axe 0 serious issues, keyboard ok |
| T3.5 | Real iPhone (Safari) + Android (Chrome) test of all v1 flows | DoD | notes in `defects.md` |
| T3.6 | The developer checks the Kazakh texts in `texts.kk.ts` | decision 18 | approved |
| T3.7 | **Production setup:** Worker `app` (app.hatm.workers.dev), D1 `hatm-prod` + migration, its own secrets (new `PEPPER`, backed up), test deploy + smoke test, then remove the test data | §M | launch day = deploy only |

**Demo / UAT (22.10):** the client and 3–5 participants use staging.

## Decision point — evening of 22.10, after UAT
If **login + «Оқыдым» + organizer mark/unmark** are not stable on staging, **we move the launch.** We don't ship broken.

## Cut list (cut from the top first, only if time runs out)
1. Offline mode → only the «Интернет жоқ» message.
2. Visual polish and animations.
3. Install-instructions page → a short text block.
4. Create-khatm screen (T2.6 UI) → the developer creates the 2 launch khatms with `seed-khatm.ts`. The screen ships a few days after launch.

**Never cut:** server-side permission checks, PIN hashing + rate limits, input validation, unit tests for the business rules (requirements §2), testing on a real iPhone and Android.

## Launch — 23.10 (the v1 slice of Phase 4 and Phase 5)
- Phase 4 for v1: test cases + traceability, defects, permission + header checks, real-device test, PWA install.
- Deploy the **same commit** that passed UAT: `npm run deploy:prod`, smoke test, uptime check.
- README: run / test / deploy, and the **pepper backup warning**.

## Phase 5 tasks (just after launch)
| ID | Task |
|---|---|
| T5.1 | CD pipeline: build once, deploy to staging automatically, production by a manual trigger |
| T5.2 | **Weekly backup workflow:** scheduled GitHub Action runs `wrangler d1 export` on `hatm-prod` with a D1-only API token (GitHub secret), uploads it as a private artifact (90 days; the repo is private, so no encryption). Test one restore into a local D1. |
| T5.3 | Maintenance guide (incl. pepper backup and recovery), organizer guide in Kazakh, incident plan |

## v1.1 backlog (after launch, in this order)
| Story | Short description |
|---|---|
| P-8 | Release my juz («Үлгермей жатырмын») |
| P-9 | Take a released juz (compare-and-set, design §E) |
| P-10 | Reclaim my released juz |
| O-9 | Notifications: released / taken |
| O-8 | Reassign a juz |
| O-10, O-11, O-12 | Extend deadline +1 day, reminder text, close early |
| O-13 | New round (shift / keep), same link |
| O-14, O-15 | More than 30 people (split juz, max 60), swap positions |
| O-16 | Rename a participant |
