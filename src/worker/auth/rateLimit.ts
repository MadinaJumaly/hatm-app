import { minutesFrom, secondsUntil } from "../lib/time.ts";
import { hmacHex } from "./tokens.ts";

// Failed-login counters in `auth_failures` (design §F). Checked BEFORE hashing, to save CPU.
// A key is blocked while it has `limit` failures inside a 15-minute window.

const WINDOW_MINUTES = 15;
export const IP_FAILURE_LIMIT = 20;

/** The rate-limit key for an IP. Only an HMAC of the IP is stored, and only for 15 minutes. */
export async function ipKey(pepper: string, ip: string): Promise<string> {
  return `ip:${await hmacHex(pepper, ip)}`;
}

export type LimitState = { blocked: false } | { blocked: true; retryAfter: number };

export async function checkLimit(
  db: D1Database,
  key: string,
  limit: number,
  now: string,
): Promise<LimitState> {
  const row = await db
    .prepare("SELECT window_start, count FROM auth_failures WHERE key = ? AND window_start > ?")
    .bind(key, minutesFrom(now, -WINDOW_MINUTES))
    .first<{ window_start: string; count: number }>();
  if (row === null || row.count < limit) return { blocked: false };
  return {
    blocked: true,
    retryAfter: secondsUntil(minutesFrom(row.window_start, WINDOW_MINUTES), now),
  };
}

/**
 * Counts one failure. The count is updated inside SQL (never read-then-write in JS), so
 * parallel requests can't lose a count (design §E). Old rows are deleted at the same time.
 */
export async function recordFailure(db: D1Database, key: string, now: string): Promise<void> {
  const windowStart = minutesFrom(now, -WINDOW_MINUTES);
  await db.batch([
    db
      .prepare("DELETE FROM auth_failures WHERE window_start <= ? AND key <> ?")
      .bind(windowStart, key),
    db
      .prepare(
        `INSERT INTO auth_failures (key, window_start, count) VALUES (?1, ?2, 1)
         ON CONFLICT (key) DO UPDATE SET
           count = CASE WHEN window_start <= ?3 THEN 1 ELSE count + 1 END,
           window_start = CASE WHEN window_start <= ?3 THEN ?2 ELSE window_start END`,
      )
      .bind(key, now, windowStart),
  ]);
}

/** Forgets the failures of a key (after a successful organizer login). */
export async function clearFailures(db: D1Database, key: string): Promise<void> {
  await db.prepare("DELETE FROM auth_failures WHERE key = ?").bind(key).run();
}
