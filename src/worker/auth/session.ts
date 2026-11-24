import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomToken } from "../../shared/random.ts";
import type { AppContext } from "../app-env.ts";
import { daysFrom, nowIso } from "../lib/time.ts";
import { sha256Hex } from "./tokens.ts";

// Sessions (design §F): a random token in an HttpOnly cookie; the DB keeps only its SHA-256,
// so a DB leak can't be used to log in. One session per device and role.

type Role = "participant" | "organizer";

const ROLES: Record<Role, { cookie: string; days: number }> = {
  participant: { cookie: "__Host-hatm_p", days: 365 },
  organizer: { cookie: "__Host-hatm_o", days: 30 },
};
const TOKEN_BYTES = 32;
const MAX_TOKEN_LENGTH = 100;

/** The hash of this request's session token for the role, or null if there is no cookie. */
async function cookieTokenHash(c: AppContext, role: Role): Promise<string | null> {
  const token = getCookie(c, ROLES[role].cookie);
  if (token === undefined || token.length > MAX_TOKEN_LENGTH) return null;
  return sha256Hex(token);
}

/** Starts a session and sets the cookie. Replaces this device's old session for the role. */
async function startSession(c: AppContext, role: Role, memberId: number | null): Promise<void> {
  const { cookie, days } = ROLES[role];
  const oldHash = await cookieTokenHash(c, role);
  const token = randomToken(TOKEN_BYTES);
  const now = nowIso();
  const statements = [
    c.env.DB.prepare(
      "INSERT INTO sessions (token_hash, role, member_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(await sha256Hex(token), role, memberId, now, daysFrom(now, days)),
  ];
  if (oldHash !== null) {
    statements.push(c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(oldHash));
  }
  await c.env.DB.batch(statements);

  setCookie(c, cookie, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

/** Ends this device's session for the role on the server and removes the cookie. */
async function endSession(c: AppContext, role: Role): Promise<void> {
  const hash = await cookieTokenHash(c, role);
  if (hash !== null) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ? AND role = ?")
      .bind(hash, role)
      .run();
  }
  deleteCookie(c, ROLES[role].cookie, { secure: true, path: "/" });
}

// ── Participant ──────────────────────────────────────────────────────────────

export type ParticipantSession = {
  tokenHash: string;
  memberId: number;
  memberName: string;
  groupId: number;
};

/** The valid participant session of this request, or null. */
export async function readParticipantSession(c: AppContext): Promise<ParticipantSession | null> {
  const tokenHash = await cookieTokenHash(c, "participant");
  if (tokenHash === null) return null;
  const row = await c.env.DB.prepare(
    `SELECT m.id AS memberId, m.display_name AS memberName, m.group_id AS groupId
     FROM sessions s JOIN members m ON m.id = s.member_id
     WHERE s.token_hash = ? AND s.role = 'participant' AND s.expires_at > ?`,
  )
    .bind(tokenHash, nowIso())
    .first<Omit<ParticipantSession, "tokenHash">>();
  return row === null ? null : { tokenHash, ...row };
}

export const startParticipantSession = (c: AppContext, memberId: number) =>
  startSession(c, "participant", memberId);

export const endParticipantSession = (c: AppContext) => endSession(c, "participant");

// ── Organizer ────────────────────────────────────────────────────────────────

/** True when this request has a valid organizer session. */
export async function hasOrganizerSession(c: AppContext): Promise<boolean> {
  const tokenHash = await cookieTokenHash(c, "organizer");
  if (tokenHash === null) return false;
  const row = await c.env.DB.prepare(
    "SELECT 1 AS ok FROM sessions WHERE token_hash = ? AND role = 'organizer' AND expires_at > ?",
  )
    .bind(tokenHash, nowIso())
    .first();
  return row !== null;
}

export const startOrganizerSession = (c: AppContext) => startSession(c, "organizer", null);

export const endOrganizerSession = (c: AppContext) => endSession(c, "organizer");
