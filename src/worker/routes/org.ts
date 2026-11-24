import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type {
  CreateKhatmRequest,
  CreateKhatmResponse,
  KhatmFieldErrors,
  OrgGroupsView,
  OrgGroupView,
} from "../../shared/api.ts";
import { todayInKz } from "../../shared/dates.ts";
import { randomToken } from "../../shared/random.ts";
import { JUZ_COUNT } from "../../shared/types.ts";
import { validateDuration, validateNames, validateTitle } from "../../shared/validation.ts";
import type { AppContext, AppEnv } from "../app-env.ts";
import { checkOrganizerLogin, ORGANIZER_FAILURE_LIMIT, ORGANIZER_KEY } from "../auth/organizer.ts";
import {
  checkLimit,
  clearFailures,
  IP_FAILURE_LIMIT,
  ipKey,
  recordFailure,
} from "../auth/rateLimit.ts";
import {
  endOrganizerSession,
  hasOrganizerSession,
  startOrganizerSession,
} from "../auth/session.ts";
import { findCurrentRound, findGroupById } from "../db/groups.ts";
import {
  createKhatm,
  findCurrentSeat,
  listGroupSummaries,
  listMembersWithPin,
  resetPin,
} from "../db/organizer.ts";
import { listSeats, setSeatStatus } from "../db/seats.ts";
import { apiError, isRecord, parseId, readJson } from "../lib/http.ts";
import { nowIso } from "../lib/time.ts";

/** Organizer routes: /api/org/… */
export const orgApi = new Hono<AppEnv>();

const MAX_USERNAME = 100;
const MAX_PASSWORD = 200;

/** The full group link, e.g. https://app.hatm.workers.dev/g/<token>. */
const groupLink = (c: AppContext, token: string) => `${new URL(c.req.url).origin}/g/${token}`;

// API #6 (O-1): same 401 for a wrong username or a wrong password; 5 failures → 15-min lock.
orgApi.post("/login", async (c) => {
  const body = await readJson(c);
  const username = isRecord(body) ? body.username : undefined;
  const password = isRecord(body) ? body.password : undefined;
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.length > MAX_USERNAME ||
    password.length > MAX_PASSWORD
  ) {
    return apiError(c, 400, "invalid");
  }

  // Rate limits first, before any hashing (design §F).
  const now = nowIso();
  const ipLimitKey = await ipKey(c.env.PEPPER, c.req.header("CF-Connecting-IP") ?? "unknown");
  for (const [key, limit, code] of [
    [ipLimitKey, IP_FAILURE_LIMIT, "too_many"],
    [ORGANIZER_KEY, ORGANIZER_FAILURE_LIMIT, "locked"],
  ] as const) {
    const state = await checkLimit(c.env.DB, key, limit, now);
    if (state.blocked) return apiError(c, 429, code, { retryAfter: state.retryAfter });
  }

  if (!(await checkOrganizerLogin({ username, password }, c.env))) {
    await recordFailure(c.env.DB, ipLimitKey, now);
    await recordFailure(c.env.DB, ORGANIZER_KEY, now);
    const state = await checkLimit(c.env.DB, ORGANIZER_KEY, ORGANIZER_FAILURE_LIMIT, now);
    if (state.blocked) return apiError(c, 429, "locked", { retryAfter: state.retryAfter });
    return apiError(c, 401, "wrong_login");
  }

  await clearFailures(c.env.DB, ORGANIZER_KEY);
  await startOrganizerSession(c);
  return c.json({ ok: true });
});

// API #7: «Шығу». Always 200.
orgApi.post("/logout", async (c) => {
  await endOrganizerSession(c);
  return c.json({ ok: true });
});

// Every route below needs an organizer session (design §D: checked on every request).
orgApi.use(
  createMiddleware<AppEnv>(async (c, next) => {
    if (!(await hasOrganizerSession(c))) return apiError(c, 401, "no_session");
    return next();
  }),
);

// API #8 (O-2): all groups with progress.
orgApi.get("/groups", async (c) => {
  const groups = await listGroupSummaries(c.env.DB);
  const body: OrgGroupsView = {
    today: todayInKz(new Date()),
    groups: groups.map(({ linkToken, ...group }) => ({
      ...group,
      link: groupLink(c, linkToken),
      total: JUZ_COUNT,
    })),
  };
  return c.json(body);
});

// API #9 (O-3, O-5): one group with all seats.
orgApi.get("/groups/:id", async (c) => {
  const groupId = parseId(c.req.param("id"));
  const group = groupId === null ? null : await findGroupById(c.env.DB, groupId);
  const round = group && (await findCurrentRound(c.env.DB, group.id));
  if (!group || !round) return apiError(c, 404, "not_found");

  const [seats, members] = await Promise.all([
    listSeats(c.env.DB, round.id),
    listMembersWithPin(c.env.DB, group.id),
  ]);
  const body: OrgGroupView = {
    id: group.id,
    title: group.title,
    link: groupLink(c, group.linkToken),
    round: { durationDays: round.durationDays, deadlineDate: round.deadlineDate },
    today: todayInKz(new Date()),
    seats,
    members,
  };
  return c.json(body);
});

// API #10 (O-4): mark / unmark any juz on someone's behalf, also «Бос». Logged as organizer.
orgApi.put("/seats/:seatId/status", async (c) => {
  const body = await readJson(c);
  const seatId = parseId(c.req.param("seatId"));
  if (!isRecord(body) || typeof body.read !== "boolean" || seatId === null) {
    return apiError(c, 400, "invalid");
  }
  const seat = await findCurrentSeat(c.env.DB, seatId);
  if (!seat) return apiError(c, 404, "not_found");

  const view = await setSeatStatus(c.env.DB, {
    seat,
    status: body.read ? "read" : "unread",
    action: body.read ? "mark" : "unmark",
    actor: { role: "organizer", memberId: null },
    now: nowIso(),
  });
  return c.json({ seat: view });
});

// API #11 (O-6): reset a forgotten PIN.
orgApi.delete("/members/:id/pin", async (c) => {
  const memberId = parseId(c.req.param("id"));
  if (memberId === null || !(await resetPin(c.env.DB, memberId, nowIso()))) {
    return apiError(c, 404, "not_found");
  }
  return c.json({ ok: true });
});

function validateKhatm(body: unknown) {
  const input: Partial<CreateKhatmRequest> = isRecord(body) ? body : {};
  const title = validateTitle(input.title);
  const duration = validateDuration(input.durationDays);
  const names = validateNames(input.names);
  if (title.ok && duration.ok && names.ok) {
    return {
      ok: true,
      title: title.value,
      durationDays: duration.value,
      names: names.value,
    } as const;
  }
  const fields: KhatmFieldErrors = {};
  if (!title.ok) fields.title = title.error;
  if (!duration.ok) fields.durationDays = duration.error;
  if (!names.ok) fields.names = names.error;
  return { ok: false, fields } as const;
}

// API #12 (O-7): create a khatm (≤ 30 names in v1). It starts today (decision 3).
orgApi.post("/khatms", async (c) => {
  const khatm = validateKhatm(await readJson(c));
  if (!khatm.ok) return apiError(c, 400, "invalid", { fields: khatm.fields });

  const linkToken = randomToken(16);
  const groupId = await createKhatm(c.env.DB, {
    title: khatm.title,
    durationDays: khatm.durationDays,
    names: khatm.names,
    startDate: todayInKz(new Date()),
    linkToken,
    now: nowIso(),
  });
  const body: CreateKhatmResponse = { groupId, link: groupLink(c, linkToken) };
  return c.json(body, 201);
});
