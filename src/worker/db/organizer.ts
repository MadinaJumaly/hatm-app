import type { OrgGroupsView } from "../../shared/api.ts";
import { deadlineDate } from "../../shared/dates.ts";
import { planSeats } from "../../shared/khatm.ts";
import type { Duration } from "../../shared/types.ts";
import { nameKey } from "../../shared/validation.ts";

type GroupSummary = Omit<OrgGroupsView["groups"][number], "link" | "total"> & { linkToken: string };

/** API #8: every group with its current round and the number of read seats, newest first. */
export async function listGroupSummaries(db: D1Database): Promise<GroupSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT g.id, g.title, g.link_token AS linkToken, r.duration_days AS durationDays,
              r.deadline_date AS deadlineDate,
              (SELECT count(*) FROM seats s WHERE s.round_id = r.id AND s.status = 'read') AS read
       FROM groups g
       JOIN rounds r ON r.group_id = g.id
        AND r.number = (SELECT MAX(number) FROM rounds WHERE group_id = g.id)
       ORDER BY g.id DESC`,
    )
    .all<GroupSummary>();
  return results;
}

/** Members of a group and whether each has a PIN (for the «PIN-кодты қалпына келтіру» button). */
export async function listMembersWithPin(
  db: D1Database,
  groupId: number,
): Promise<{ id: number; name: string; hasPin: boolean }[]> {
  const { results } = await db
    .prepare(
      "SELECT id, display_name AS name, pin_hash IS NOT NULL AS hasPin FROM members WHERE group_id = ?",
    )
    .bind(groupId)
    .all<{ id: number; name: string; hasPin: number }>();
  return results.map((m) => ({ ...m, hasPin: m.hasPin === 1 }));
}

/** Any seat of a group's current round (the organizer may change any juz, also «Бос»). */
export function findCurrentSeat(
  db: D1Database,
  seatId: number,
): Promise<{ id: number; juz: number; roundId: number; groupId: number } | null> {
  return db
    .prepare(
      `SELECT s.id, s.juz, s.round_id AS roundId, r.group_id AS groupId
       FROM seats s JOIN rounds r ON r.id = s.round_id
       WHERE s.id = ? AND r.number = (SELECT MAX(number) FROM rounds WHERE group_id = r.group_id)`,
    )
    .bind(seatId)
    .first();
}

/**
 * API #11 (O-6): deletes the member's PIN, clears the lock, ends ALL their sessions, and logs
 * `pin_reset` in one transaction. Returns false if the member doesn't exist.
 */
export async function resetPin(db: D1Database, memberId: number, now: string): Promise<boolean> {
  const results = await db.batch([
    db
      .prepare(
        "UPDATE members SET pin_hash = NULL, pin_fail_count = 0, pin_locked_until = NULL WHERE id = ?",
      )
      .bind(memberId),
    db
      .prepare(
        `INSERT INTO change_log (at, actor_role, action, group_id)
         SELECT ?, 'organizer', 'pin_reset', group_id FROM members WHERE id = ? AND changes() = 1`,
      )
      .bind(now, memberId),
    db.prepare("DELETE FROM sessions WHERE member_id = ?").bind(memberId),
  ]);
  return results[0]?.meta.changes === 1;
}

export type NewKhatm = {
  title: string;
  durationDays: Duration;
  names: string[];
  startDate: string;
  linkToken: string;
  now: string;
};

/**
 * API #12 (O-7): creates group, round 1, members, 30 seats (BR-2) and the `create_khatm` log
 * row in ONE transaction: all saved, or nothing. Rows find each other by the new link token.
 */
export async function createKhatm(db: D1Database, khatm: NewKhatm): Promise<number> {
  const { title, durationDays, names, startDate, linkToken, now } = khatm;
  const groupId = "(SELECT id FROM groups WHERE link_token = ?)";
  const roundId = `(SELECT id FROM rounds WHERE group_id = ${groupId} AND number = 1)`;
  const memberId = `(SELECT id FROM members WHERE group_id = ${groupId} AND name_key = ?)`;

  const results = await db.batch([
    db
      .prepare("INSERT INTO groups (title, link_token, created_at) VALUES (?, ?, ?)")
      .bind(title, linkToken, now),
    db
      .prepare(
        `INSERT INTO rounds (group_id, number, duration_days, start_date, deadline_date, created_at)
         VALUES (${groupId}, 1, ?, ?, ?, ?)`,
      )
      .bind(linkToken, durationDays, startDate, deadlineDate(startDate, durationDays), now),
    ...names.map((name) =>
      db
        .prepare(
          `INSERT INTO members (group_id, display_name, name_key, created_at) VALUES (${groupId}, ?, ?, ?)`,
        )
        .bind(linkToken, name, nameKey(name), now),
    ),
    ...planSeats(names).map((seat) =>
      seat.name === null
        ? db
            .prepare(
              `INSERT INTO seats (round_id, juz, member_id, updated_at) VALUES (${roundId}, ?, NULL, ?)`,
            )
            .bind(linkToken, seat.juz, now)
        : db
            .prepare(
              `INSERT INTO seats (round_id, juz, member_id, updated_at) VALUES (${roundId}, ?, ${memberId}, ?)`,
            )
            .bind(linkToken, seat.juz, linkToken, nameKey(seat.name), now),
    ),
    db
      .prepare(
        `INSERT INTO change_log (at, actor_role, action, group_id, round_id)
         VALUES (?, 'organizer', 'create_khatm', ${groupId}, ${roundId})`,
      )
      .bind(now, linkToken, linkToken),
    db.prepare("SELECT id FROM groups WHERE link_token = ?").bind(linkToken),
  ]);
  const created = results.at(-1)?.results[0] as { id: number } | undefined;
  if (!created) throw new Error("khatm not created");
  return created.id;
}
