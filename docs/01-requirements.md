# 01 — Requirements (v1, launch 23.10.2026)

Status: **Approved 21.10.2026** · Phase 1 of 5

Each item is tagged **v1** (we build it before launch) or **v1.1** (after launch). v1.1 items are kept very short on purpose.

---

## 1. Decisions from the Q&A (21.10.2026)

| # | Decision |
|---|---|
| 1 | Launch date 23.10 is fixed. UAT with the client is on 22.10. Scope is exactly what is listed as v1. |
| 2 | Names get juz 1, 2, 3… in list order. A juz with no name is **«Бос»** (free). Only the organizer can mark it. |
| 3 | The khatm starts on the day it is created. Deadline = start day + (duration − 1) days, at 23:59 Kazakhstan time (UTC+5). Example: 7 days created on Monday → ends Sunday 23:59. |
| 4 | After the deadline nothing is locked. An unread juz is shown as **«Мерзімі өтті»** (overdue). |
| 5 | In v1, creating a khatm also creates a group with its own link. |
| 6 | Duplicate names in one list are refused. |
| 7 | Names can't be edited after creation in v1 (renaming comes in v1.1). |
| 8 | Participants can see each other's names and statuses. |
| 9 | «Оқыдым» can be undone for **15 seconds**. After that, removing the mark needs a confirmation. |
| 10 | A «Шығу» button (with a confirmation that explains switching) logs the person out, so someone else can use the same phone. *(Was «Мен емеспін»; changed to match the mockups, 21.10.2026.)* |
| 11 | Offline: the app opens and shows the last loaded data, read-only. Marking needs internet. |
| 12 | 5 wrong PINs → that name is locked for 15 minutes. There is also a per-IP limit. The organizer can reset a PIN. |
| 13 | Session length: participant 1 year, organizer 30 days. |
| 14 | Store first name + initial only (e.g. "Айгүл А."). No surnames, no phone numbers. |
| 15 | There is one organizer account. |
| 16 | We use a free subdomain, no custom domain. |
| 17 | Data is kept forever. Free DB backups (if the tier has them) + a manual export every week. |
| 18 | I (Claude) write the Kazakh texts. The developer checks them first, then the client checks them during UAT. |

## 2. Business rules (EARS)

- **BR-1** The system shall split the Quran into 30 juz using the standard Medina mushaf (604 pages): juz *n* (n = 2…29) is pages 20n−18 to 20n+1, juz 1 is pages 1–21, juz 30 is pages 582–604.
- **BR-2** When a khatm is created with N names (1 ≤ N ≤ 30), the system shall assign name *i* to juz *i*, and mark juz N+1…30 as «Бос».
- **BR-3** The system shall store all times in UTC and show them in UTC+5.
- **BR-4** While today (UTC+5) is on or before the deadline day, the system shall show "days left" = (deadline date − today) + 1. On the deadline day itself it shows "Бүгін соңғы күн" (today is the last day).
- **BR-5** While the deadline has passed and a juz is not read, the system shall show it as «Мерзімі өтті».
- **BR-6** When all 30 juz are read, the system shall show the khatm as finished («Хатм аяқталды»).
- **BR-7** Marking and unmarking shall *set* the state (read / not read), never *toggle* it. This way a double tap or a repeated request can't flip the result by mistake.
- **BR-8** When the same juz is changed by two people (for example the organizer and the participant), the server shall apply the changes in the order they arrive. Both changes are logged. The screen shows the final state after the next refresh.
- **BR-9** The system shall log every change to a juz and every PIN reset: who did it, what they did, which juz/group, and when.

## 3. User stories and acceptance criteria

### Participant — v1

**P-1 Log in with name + PIN (v1)**
As a participant, I want to open my group's link and pick my name, so that I can see my juz without an account or phone number.
- Given I open a valid group link for the first time, when I pick my name and enter a 4-digit PIN twice, then my PIN is saved and I see my juz.
- Given my name already has a PIN, when I enter the correct PIN, then I see my juz, and this device remembers me for 1 year.
- Given I enter a wrong PIN, then I see "PIN қате" and how many tries I have left.
- Given I entered a wrong PIN 5 times, then my name is locked for 15 minutes and I see a message telling me to wait or ask the organizer.
- Any 4-digit PIN is accepted, including simple ones like 0000 or 1234.
- Given I open a link with an unknown or broken token, then I see "Сілтеме қате" (wrong link) and no group data.
- Note: on iPhone, the installed home-screen app doesn't share storage with Safari, so I log in once more after installing. The install instructions say this.

**P-2 See my juz (v1)**
As a participant, I want to see my juz number, pages, deadline and days left, so that I know what to read and by when.
- Given I'm logged in, when I open the app, then I see: juz number, page range (BR-1), deadline date, days left (BR-4), and my status.
- Given the deadline has passed and my juz isn't read, then I see «Мерзімі өтті».

**P-3 Mark «Оқыдым» with Undo (v1)**
As a participant, I want to tap «Оқыдым» when I finish, so that the group sees my juz is done.
- Given my juz is not read, when I tap «Оқыдым», then it is saved as read, and I see «Белгіленді» with a «Қайтару» (undo) button for 15 seconds, inside the juz card.
- Given I tap «Қайтару» within 15 seconds, then my juz goes back to not read, without a confirmation.
- After 15 seconds I see «Рақмет! Сіз бұл параны оқыдыңыз.» and a «Белгіні алып тастау» button.
- Given there's no internet, when I tap «Оқыдым», then nothing changes and I see "Интернет жоқ" (no internet). The button stays available so I can try again.
- Given I tap twice quickly, then the juz is still marked read once (BR-7).

**P-4 Remove my own mark (v1)**
As a participant, I want to remove my "read" mark, so that I can fix a mistake.
- Given my juz is read and the Undo time is over, when I tap «Белгіні алып тастау» and confirm («Иә, алып тастау»), then it goes back to not read.
- Given I cancel the dialog, then nothing changes.
- I can only change **my own** juz. The server refuses any other juz (403).

**P-5 See group progress (v1)**
As a participant, I want to see all 30 juz with names and statuses, so that I feel part of the group.
- Given I'm logged in, then I see "X / 30 оқылды" and a list of juz 1–30, each with a name (or «Ешкім жоқ» + «Бос») and a status shown by text (and an icon for «Оқылды»): «Оқылды», «Оқылмаған», «Мерзімі өтті», «Бос».
- Given others changed their status, when I open the app or come back to it (for example switching back from WhatsApp), then the data refreshes automatically.
- When I tap «Жаңарту» (refresh) or pull down on the list, then the data refreshes, and I see that it is loading.
- No live updates while the app stays open (v1).
- I see only my own group.

**P-6 Install instructions (v1)**
As a participant, I want simple steps to add the site to my home screen, so that I can open it like an app.
- Given I'm on iPhone Safari, then I see the iPhone steps (Share → "Add to Home Screen") and the note about logging in once more.
- Given I'm on Android Chrome, then I see the Android steps (or the install button, if the browser offers one).
- Given the app is already installed, then the instructions are hidden or can be collapsed.

**P-7 «Шығу» / log out (v1)**
As a participant sharing a phone, I want to log out, so that another family member can pick their name.
- When I tap «Шығу», then I see «Шығасыз ба? Осы телефонда басқа адам өз есімін таңдай алады.» with «Иә, шығу» / «Жоқ».
- When I confirm, then my session on this device ends and I see the name list.

### Participant — v1.1
- **P-8 Release my juz** («Үлгермей жатырмын»). Given my juz isn't read, when I release it and confirm, then it becomes available for others and the organizer is notified.
- **P-9 Take a released juz.** Given I finished my own juz and I hold no helper juz, when I take a released juz, then it becomes mine. If two people try at the same moment, only one succeeds.
- **P-10 Reclaim my released juz.** Given nobody has taken it, when I reclaim it, then it is mine again.

### Organizer — v1

**O-1 Log in / log out (v1)**
As the organizer, I want to log in with a username and password, so that only I can manage the groups.
- Given correct credentials (set through environment variables, stored hashed), then I see the groups page and I stay logged in for 30 days.
- Given 5 wrong tries, then login is locked for 15 minutes.
- When I tap "Шығу" (log out), then my session ends on the server.

**O-2 See all groups (v1)**
As the organizer, I want to see all groups with their progress, so that I know where help is needed.
- Then each group shows its title, deadline, days left and "X / 30".

**O-3 Open a group (v1)**
As the organizer, I want to see every reader and their status, so that I can follow up with them.
- Then I see the deadline and juz 1–30, each with a name and status.
- When I turn on the "only unread" filter, then only unread juz are shown (including «Бос» and overdue ones).

**O-4 Mark / unmark on someone's behalf (v1)**
As the organizer, I want to mark or unmark any juz, so that I can record people who told me in person.
- When I mark a juz as read, then it is saved and logged as "by organizer".
- When I unmark it, then I confirm first, and it is saved and logged.
- This works for «Бос» juz too.

**O-5 Copy a group link (v1)**
As the organizer, I want to copy the group link, so that I can send it in WhatsApp.
- When I tap "Сілтемені көшіру" (copy link), then the full link is copied and I see "Көшірілді" (copied).
- If copying isn't supported, then the link is shown selected so I can copy it by hand.

**O-6 Reset a PIN (v1)**
As the organizer, I want to reset a participant's forgotten PIN, so that they can log in again.
- When I tap "PIN-ді өшіру" (reset PIN) for a person and confirm, then their PIN is deleted, their lock is cleared, **all their sessions end**, and the reset is logged.
- On their next visit, the person creates a new PIN (as in P-1).

**O-7 Create a khatm (v1)**
As the organizer, I want to create a khatm from a title, a duration and a names list, so that I can start quickly.
- Given a title (1–80 characters), a duration of 7 / 15 / 20 / 30 days, and 1–30 names (one per line), when I save, then a group is created with a secret link and juz are assigned by BR-2.
- Empty lines and extra spaces are ignored.
- Given 0 names, more than 30 names, a name longer than 40 characters, or duplicate names (case-insensitive), then nothing is saved and I see a clear error that names the line.
- Before saving, I see a preview: juz number → name.

### Organizer — v1.1
- **O-8 Reassign** a juz to another person.
- **O-9 Notifications**: who released a juz and who took one, across all groups.
- **O-10 Extend deadline** by 1 day. **O-11 Copy reminder text.** **O-12 Close a khatm early** (with confirmation).
- **O-13 New round**: shift everyone one juz forward, or keep the same juz. Same group link.
- **O-14 More than 30 people**: choose which juz are split in half (max 60 people). **O-15 Swap** two people's positions.
- **O-16 Rename** a participant (typo fix).

### System — v1
**S-1 Change log (v1)**: every mark, unmark, undo, PIN reset and khatm creation is stored (actor, action, group, juz, time). Rows are never edited or deleted. In v1 there is no screen for the log; the developer reads it in the database.

## 4. Error handling

| Situation | What the user sees | Server |
|---|---|---|
| Wrong PIN | "PIN қате" + tries left | 401, count the attempt |
| Name locked (5 fails) | "15 минуттан кейін қайталаңыз немесе ұйымдастырушыға жазыңыз" | 429 |
| Too many tries from one IP | Same message | 429 |
| Bad / unknown group link | "Сілтеме қате" | 404, same answer for every bad token |
| Session expired / PIN was reset | Back to the name list | 401 |
| No internet | "Интернет жоқ", last data shown; buttons stay available and tapping one explains there is no internet (P-3) | — |
| Changing someone else's juz | "Рұқсат жоқ" (not allowed) | 403 |
| Invalid form input | Message next to the field | 400 with field errors |
| Server error | "Қате шықты, қайталап көріңіз" (an error happened, try again) | 500, logged without personal data |

The developer checked and approved all Kazakh texts in T3.6 (22.10.2026). `src/web/texts.kk.ts` is the source of truth.

## 5. Non-functional requirements

| Area | Requirement (v1) |
|---|---|
| Users / load | 2 groups × 30 = 60 participants + 1 organizer. Must handle all 60 opening the app within the same minute (for example after a WhatsApp message). |
| Performance | Lighthouse mobile Performance ≥ 90. First load ≤ 3 s on a mid-range phone with a 4G connection. A tap on «Оқыдым» shows its result in ≤ 1 s (loading state while waiting). JS ≤ 150 KB gzipped. |
| Availability | Online 24/7, about 99% per month. **No free tier that pauses when inactive** (or else a proven keep-alive). No regular manual maintenance. Checked in Phase 2. |
| Cost | 0 tenge. Free tiers only. Their limits are written down in Phase 2. |
| Devices | iPhone Safari (iOS 16.4+), Android Chrome (last 2 years of versions), desktop Chrome / Safari / Edge for the organizer. Screens from 320 px wide. |
| PWA | Installable on iPhone and Android, with a manifest, icons and a service worker. |
| Offline | The app shell and the last loaded data show offline, read-only, with a clear "no internet" banner. |
| Language | Kazakh (Cyrillic) only, `lang="kk"`. |
| Backup | Daily automatic backup if the free DB has one, plus a manual export every week. Most data we can lose: 7 days. Restore within 1 day. A restore is tested before launch. |
| Privacy | No analytics, no trackers, no third-party fonts or scripts. |
| Maintainability | One junior developer can run, test and deploy it from the README. |

### Accessibility checklist (tested in Phase 4)
Target: WCAG 2.2 AA, plus extra care for older users.

- [ ] Base text ≥ 18 px. Key numbers (juz, days left) are larger.
- [ ] Tap targets ≥ 48 × 48 px, with ≥ 8 px between them.
- [ ] Text contrast ≥ 4.5:1. Icons and borders ≥ 3:1.
- [ ] Status is never shown by colour alone (icon + text).
- [ ] Works at 200% zoom and with large system font, with no horizontal scroll at 320 px.
- [ ] Every input has a visible label. The PIN field opens the number keypad.
- [ ] Errors appear as text next to the field and are announced to screen readers (`aria-live`).
- [ ] Confirmation dialogs say clearly what will happen and have clear Yes / No buttons. Focus stays inside the dialog.
- [ ] Everything works with the keyboard (organizer on desktop), with a visible focus outline.
- [ ] Icons have text labels for screen readers. The page has one `h1` and a logical heading order.
- [ ] Each screen has its own page title. `lang="kk"` is set.
- [ ] Animations respect `prefers-reduced-motion`.
- [ ] Undo has a time limit (15 s), but the same result is always possible later through "remove mark", so no task depends on a timer.

## 6. Security and privacy requirements

### 6.1 Roles and permissions

| Action | Anyone with no link | Participant (own group) | Organizer |
|---|---|---|---|
| See a group's names / statuses | ✗ | ✓ own group only | ✓ all |
| Mark / unmark a juz | ✗ | ✓ **own juz only** | ✓ any |
| Reset a PIN | ✗ | ✗ | ✓ |
| Create a khatm, copy links | ✗ | ✗ | ✓ |
| See the change log | ✗ | ✗ | developer only (DB) in v1 |

Every permission is checked **on the server**, on every request.

### 6.2 Data we store

| Data | Sensitivity | Notes |
|---|---|---|
| Participant name (first name + initial) | **Medium** | Personal data. Linked to a religious activity, so we keep as little as possible. |
| Group title, dates, juz status | Low | |
| PIN | High | Only a hash is stored: PBKDF2-SHA256 with a per-user random salt and a secret pepper (see 6.4). |
| Session tokens | High | Only a hash is stored in the DB. HttpOnly cookie. |
| Group link token | Medium | Anyone with the link can see the name list. |
| Organizer username / password hash | High | Environment variables only. Never in code or git. |
| Change log | Low–Medium | Actor id, action, time. No IP addresses stored long-term. |

We don't store phone numbers, surnames, emails or analytics. The free database is hosted abroad. The client accepted this, and we keep only first name + initial (decision 14).

### 6.3 Likely attackers and attack paths
1. **A curious or mischievous group member** (has the link). Tries to mark someone else's juz, guesses PINs, or picks someone else's name before they do ("name claiming").
2. **An outsider who got a forwarded link.** Same paths as 1.
3. **Internet bots.** Brute-force the organizer login, scan for weak spots, or flood requests to use up the free-tier limits.
4. **A lost or shared phone.** A long session gives access to that person's juz.
5. **Script injection (XSS)** through names or titles.
6. **Supply chain / account takeover.** A bad npm package, or someone taking over the developer's GitHub or hosting account.

### 6.4 Requirements
- **Hashing (PINs and the organizer password):** PBKDF2-SHA256 with a per-user random salt, a secret pepper (a Cloudflare secret, different for staging and production, never in code or config, backed up by the developer) and constant-time comparison. The iteration count is the highest that fits the Workers free-plan CPU limit, measured on Workers (see `02-design.md` §G).
- **Authentication, participant:** 4-digit PIN, entered twice when created. Any 4 digits are allowed. PINs are hashed. 5 fails per name → 15-min lock. Max 20 failed attempts per IP per 15 min (high enough for many phones sharing one mobile-network IP).
- **Authentication, organizer:** credentials from environment variables, hashed password (≥ 6 characters), 5 fails → 15-min lock, plus the same per-IP limit as for PINs. Same error message for a wrong username or a wrong password.
- **Sessions:** random token in an `HttpOnly; Secure; SameSite=Lax` cookie, stored hashed on the server, can be ended from the server (logout, PIN reset). Participant session 1 year, organizer session 30 days.
- **Authorization:** the server checks the group and juz owner on every write. The client is never trusted.
- **Group link:** a random token of at least 128 bits. Every bad token gets the same 404 answer.
- **CSRF:** SameSite cookies, plus a check of the `Origin` header on every request that changes data.
- **Input validation (server):** title 1–80 characters, names 1–40 characters (letters including Kazakh letters, spaces, `.`, `-`, `'`), duration only 7/15/20/30, 1–30 names, PIN exactly 4 digits. Control characters are removed.
- **Output:** all output is escaped (no raw HTML from data).
- **Transport and headers:** HTTPS only plus HSTS. Strict CSP (no inline scripts, no third-party sources). `Referrer-Policy: no-referrer`, so the link token doesn't leak to other sites. `X-Content-Type-Options: nosniff`. `frame-ancestors 'none'`.
- **Logging:** the change log (S-1) is kept. App logs never contain PINs, passwords, tokens or full links.
- **Secrets and accounts:** no secrets in git (a secret scan runs in CI). The developer turns on 2FA for the GitHub, hosting and database accounts.
- **Dependencies:** `npm audit` (or similar) runs in CI. Few dependencies.

### 6.5 Risk assessment

| # | Risk | Likelihood | Impact | Priority | Mitigation |
|---|---|---|---|---|---|
| R1 | Member marks/unmarks someone else's juz via API | Medium | Medium | **High** | Server-side owner check (6.4), change log |
| R2 | Someone sets a PIN on another person's name first | Low | Medium | Medium | Organizer PIN reset ends all sessions; log; link only shared in group |
| R3 | PIN guessing (simple PINs are allowed) | Medium | Low | Medium | Per-name and per-IP limits, change log, PIN reset |
| R4 | Organizer password brute force (min. 6 characters) | Medium | High | **High** | Lockout + per-IP limit, hashed, avoid common passwords |
| R5 | XSS through names or titles | Low | High | **High** | Validation, escaping, strict CSP |
| R6 | Group link leaks (forwarded, Referer header) | Medium | Low | Medium | `no-referrer`, names minimised, no other personal data |
| R7 | Free tier pauses or limits hit → site down | Medium | High | **High** | Choose a non-pausing tier in Phase 2, uptime check |
| R8 | Data loss | Low | High | Medium | Backups + tested restore |
| R9 | Vulnerable dependency | Medium | Medium | Medium | CI audit, minimal dependencies |
| R10 | Developer account takeover | Low | High | Medium | 2FA, secrets only in env vars |
| R11 | Lost phone with a 1-year session | Low | Low | Low | «Мен емеспін», organizer PIN reset ends sessions |
| R12 | Personal data stored abroad (KZ law) | Low | Medium | Medium | Client accepted it; first name + initial only |

## 7. Definition of Ready (a task can start when…)
- [ ] It links to a user story and its acceptance criteria are clear and testable.
- [ ] It is tagged v1 or v1.1.
- [ ] Its UI texts (Kazakh) are drafted, and the design / API part is known.
- [ ] Its security needs (who may call it, what to validate) are written down.
- [ ] It is small enough to finish in one day or less.

## 8. Definition of Done (a task is done when…)
- [ ] All acceptance criteria pass.
- [ ] Unit tests are written for the logic, plus API tests for each endpoint, and all pass in CI.
- [ ] Lint, formatter, type check, dependency audit and secret scan are clean.
- [ ] The code is reviewed (self-review plus the developer's approval in a PR).
- [ ] Permissions are checked on the server, and input is validated and output escaped.
- [ ] It meets the accessibility checklist for the screens it touches.
- [ ] It is checked on a phone-size screen (320 px) and works on iPhone Safari and Android Chrome.
- [ ] No secrets in code. Any shortcut is written in `docs/tech-debt.md`.

## 9. Out of scope for v1
- Everything tagged v1.1: release / take / reclaim (P-8…P-10), reassign, notifications, extend deadline, reminder text, close early, new round, more than 30 people / split juz, swap positions, rename participant.
- A screen for the change log. Live (real-time) updates. Push notifications or SMS.
- Saving marks offline to send later.
- Deleting or editing a khatm. More than one organizer.
- Russian or other languages. A custom domain. Analytics.
- Quran text or audio inside the app.

## 10. Open questions
None. The developer and the client answered everything on 21.10.2026 (section 1).

Changes made at approval (21.10.2026): any 4-digit PIN is allowed; data refreshes when the app comes back to the foreground, with a «Жаңарту» button and pull-to-refresh; the organizer password minimum is 6 characters, with lockout and rate limiting kept.

Changed in Phase 2 (21.10.2026): PIN and password hashing changed from argon2id/bcrypt to PBKDF2-SHA256 + salt + pepper, because the free Workers plan allows only 10 ms CPU per request (§6.2, §6.4; reason in `02-design.md` §G).

Changed in Phase 3 (21.10.2026), to match the approved screen mockups: P-3 texts («Белгіленді» + «Қайтару», then «Рақмет!»), P-5 status texts, P-7 button «Шығу» with an explaining confirmation (decision 10).
