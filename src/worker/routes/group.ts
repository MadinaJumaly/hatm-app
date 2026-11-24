import { Hono } from "hono";
import type { GroupPublicView, LoginRequest } from "../../shared/api.ts";
import { compareKazakh } from "../../shared/khatm.ts";
import { isValidPin } from "../../shared/validation.ts";
import type { AppContext, AppEnv } from "../app-env.ts";
import { hashSecret } from "../auth/hash.ts";
import { verifySecret } from "../auth/verify.ts";
import { checkLimit, IP_FAILURE_LIMIT, ipKey, recordFailure } from "../auth/rateLimit.ts";
import { startParticipantSession } from "../auth/session.ts";
import { findCurrentRound, findGroupByToken } from "../db/groups.ts";
import {
  clearPinFailures,
  findMember,
  listMembers,
  recordPinFailure,
  setFirstPin,
} from "../db/members.ts";
import { apiError, isRecord, readJson } from "../lib/http.ts";
import { nowIso, secondsUntil } from "../lib/time.ts";

/** Routes reached through a group link: /api/g/:token… */
export const groupApi = new Hono<AppEnv>();

// API #1: the name list. Every bad token gets the same 404 (design §F).
groupApi.get("/:token", async (c) => {
  const group = await findGroupByToken(c.env.DB, c.req.param("token"));
  const round = group && (await findCurrentRound(c.env.DB, group.id));
  if (!group || !round) return apiError(c, 404, "bad_link");

  const members = await listMembers(c.env.DB, group.id, round.id);
  const body: GroupPublicView = {
    title: group.title,
    round: { durationDays: round.durationDays, deadlineDate: round.deadlineDate },
    members: members
      .map((m) => ({ id: m.id, name: m.name, juz: m.juz, hasPin: m.hasPin === 1 }))
      .sort((a, b) => compareKazakh(a.name, b.name)),
  };
  return c.json(body);
});

function parseLogin(body: unknown): LoginRequest | null {
  if (!isRecord(body)) return null;
  const { memberId, pin, pinConfirm } = body;
  if (typeof memberId !== "number" || !Number.isSafeInteger(memberId) || memberId < 1) return null;
  if (!isValidPin(pin)) return null;
  if (pinConfirm !== undefined && typeof pinConfirm !== "string") return null;
  return pinConfirm === undefined ? { memberId, pin } : { memberId, pin, pinConfirm };
}

// API #2: create the first PIN, or log in with the PIN (P-1).
groupApi.post("/:token/login", async (c) => {
  const group = await findGroupByToken(c.env.DB, c.req.param("token"));
  if (!group) return apiError(c, 404, "bad_link");

  const login = parseLogin(await readJson(c));
  if (!login) return apiError(c, 400, "invalid");
  const member = await findMember(c.env.DB, group.id, login.memberId);
  if (!member) return apiError(c, 400, "invalid");

  // Rate limits first, before any hashing (design §F).
  const now = nowIso();
  const ipLimitKey = await ipKey(c.env.PEPPER, c.req.header("CF-Connecting-IP") ?? "unknown");
  const ipLimit = await checkLimit(c.env.DB, ipLimitKey, IP_FAILURE_LIMIT, now);
  if (ipLimit.blocked) return apiError(c, 429, "too_many", { retryAfter: ipLimit.retryAfter });
  if (member.lockedUntil !== null && member.lockedUntil > now) {
    return apiError(c, 429, "locked", { retryAfter: secondsUntil(member.lockedUntil, now) });
  }

  if (member.pinHash === null) {
    if (login.pinConfirm === undefined) return apiError(c, 400, "invalid");
    if (login.pinConfirm !== login.pin) return apiError(c, 400, "pin_mismatch");
    const pinHash = await hashSecret(login.pin, c.env.PEPPER);
    const saved = await setFirstPin(c.env.DB, { id: member.id, groupId: group.id }, pinHash, now);
    if (!saved) return apiError(c, 409, "pin_already_set");
  } else if (login.pinConfirm !== undefined) {
    // The app thought this is a first visit, but someone set a PIN meanwhile (name claiming,
    // design §E). Don't check or count this PIN: tell the app to ask for the PIN instead.
    return apiError(c, 409, "pin_already_set");
  } else if (await verifySecret(login.pin, member.pinHash, c.env.PEPPER)) {
    await clearPinFailures(c.env.DB, member.id);
  } else {
    return wrongPin(c, member.id, ipLimitKey, now);
  }

  await startParticipantSession(c, member.id);
  return c.json({ ok: true });
});

async function wrongPin(c: AppContext, memberId: number, ipLimitKey: string, now: string) {
  await recordFailure(c.env.DB, ipLimitKey, now);
  const failure = await recordPinFailure(c.env.DB, memberId, now);
  if (failure.lockedUntil !== null && failure.lockedUntil > now) {
    return apiError(c, 429, "locked", { retryAfter: secondsUntil(failure.lockedUntil, now) });
  }
  return apiError(c, 401, "wrong_pin", { triesLeft: failure.triesLeft });
}

/** API #13: the web app manifest of one group, so the installed app opens that group (§H). */
export const groupManifest = new Hono<AppEnv>().get("/:token/manifest.webmanifest", async (c) => {
  const group = await findGroupByToken(c.env.DB, c.req.param("token"));
  if (!group) return apiError(c, 404, "bad_link");
  const startUrl = `/g/${group.linkToken}`;
  const manifest = {
    id: startUrl,
    name: `Хатм — ${group.title}`,
    short_name: "Хатм",
    lang: "kk",
    dir: "ltr",
    display: "standalone",
    start_url: startUrl,
    scope: "/",
    theme_color: "#0E5E4E",
    background_color: "#F4F6F5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return c.body(JSON.stringify(manifest), 200, { "Content-Type": "application/manifest+json" });
});
