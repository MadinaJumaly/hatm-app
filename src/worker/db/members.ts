import { minutesFrom } from "../lib/time.ts";

export const PIN_FAILURE_LIMIT = 5;
const LOCK_MINUTES = 15;

export type MemberRow = {
  id: number;
  name: string;
  pinHash: string | null;
  lockedUntil: string | null;
};

export type MemberListRow = { id: number; name: string; juz: number | null; hasPin: number };

/** The group's members with the juz they read in the given round (name list, API #1). */
export async function listMembers(
  db: D1Database,
  groupId: number,
  roundId: number,
): Promise<MemberListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.display_name AS name, s.juz, m.pin_hash IS NOT NULL AS hasPin
       FROM members m LEFT JOIN seats s ON s.member_id = m.id AND s.round_id = ?
       WHERE m.group_id = ?`,
    )
    .bind(roundId, groupId)
    .all<MemberListRow>();
  return results;
}

/** A member of this group, or null (a member of another group is never returned). */
export function findMember(
  db: D1Database,
  groupId: number,
  memberId: number,
): Promise<MemberRow | null> {
  return db
    .prepare(
      `SELECT id, display_name AS name, pin_hash AS pinHash, pin_locked_until AS lockedUntil
       FROM members WHERE id = ? AND group_id = ?`,
    )
    .bind(memberId, groupId)
    .first<MemberRow>();
}

/**
 * Saves the first PIN, only if the member still has none (design §E: two people racing to set
 * a PIN on the same name → exactly one wins). Logs `pin_set` in the same transaction.
 * Returns false if someone else set a PIN first.
 */
export async function setFirstPin(
  db: D1Database,
  member: { id: number; groupId: number },
  pinHash: string,
  now: string,
): Promise<boolean> {
  const [update] = await db.batch([
    db
      .prepare(
        "UPDATE members SET pin_hash = ?, pin_fail_count = 0, pin_locked_until = NULL WHERE id = ? AND pin_hash IS NULL",
      )
      .bind(pinHash, member.id),
    db
      .prepare(
        `INSERT INTO change_log (at, actor_role, actor_member_id, action, group_id)
         SELECT ?, 'participant', ?, 'pin_set', ? WHERE changes() = 1`,
      )
      .bind(now, member.id, member.groupId),
  ]);
  return update?.meta.changes === 1;
}

export type PinFailure = { triesLeft: number; lockedUntil: string | null };

/**
 * Counts a wrong PIN for the member, inside SQL so parallel requests can't lose a count.
 * The 5th failure locks the name for 15 minutes. A lock that has run out starts a new count.
 */
export async function recordPinFailure(
  db: D1Database,
  memberId: number,
  now: string,
): Promise<PinFailure> {
  const row = await db
    .prepare(
      `UPDATE members SET
         pin_fail_count = CASE WHEN pin_locked_until <= ?1 THEN 1 ELSE pin_fail_count + 1 END,
         pin_locked_until = CASE
           WHEN (CASE WHEN pin_locked_until <= ?1 THEN 1 ELSE pin_fail_count + 1 END) >= ?3 THEN ?2
           WHEN pin_locked_until <= ?1 THEN NULL
           ELSE pin_locked_until END
       WHERE id = ?4
       RETURNING pin_fail_count AS failCount, pin_locked_until AS lockedUntil`,
    )
    .bind(now, minutesFrom(now, LOCK_MINUTES), PIN_FAILURE_LIMIT, memberId)
    .first<{ failCount: number; lockedUntil: string | null }>();
  const failCount = row?.failCount ?? PIN_FAILURE_LIMIT;
  return {
    triesLeft: Math.max(0, PIN_FAILURE_LIMIT - failCount),
    lockedUntil: row?.lockedUntil ?? null,
  };
}

export async function clearPinFailures(db: D1Database, memberId: number): Promise<void> {
  await db
    .prepare("UPDATE members SET pin_fail_count = 0, pin_locked_until = NULL WHERE id = ?")
    .bind(memberId)
    .run();
}
