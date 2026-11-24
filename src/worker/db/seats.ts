import type { SeatView } from "../../shared/api.ts";
import type { SeatStatus } from "../../shared/types.ts";

const SEAT_VIEW_COLUMNS = `s.id, s.juz, s.member_id AS memberId, m.display_name AS name,
  s.status, s.read_at AS readAt`;

export async function listSeats(db: D1Database, roundId: number): Promise<SeatView[]> {
  const { results } = await db
    .prepare(
      `SELECT ${SEAT_VIEW_COLUMNS} FROM seats s LEFT JOIN members m ON m.id = s.member_id
       WHERE s.round_id = ? ORDER BY s.juz, s.part`,
    )
    .bind(roundId)
    .all<SeatView>();
  return results;
}

/**
 * The seat, only if it belongs to this member AND is in their group's current round.
 * Anything else returns null, so the caller answers 403 (design §D, threat T1).
 */
export function findOwnSeat(
  db: D1Database,
  seatId: number,
  memberId: number,
): Promise<{ id: number; juz: number; roundId: number; groupId: number } | null> {
  return db
    .prepare(
      `SELECT s.id, s.juz, s.round_id AS roundId, r.group_id AS groupId
       FROM seats s JOIN rounds r ON r.id = s.round_id
       WHERE s.id = ? AND s.member_id = ?
         AND r.number = (SELECT MAX(number) FROM rounds WHERE group_id = r.group_id)`,
    )
    .bind(seatId, memberId)
    .first();
}

export type StatusChange = {
  seat: { id: number; juz: number; roundId: number; groupId: number };
  status: SeatStatus;
  action: "mark" | "unmark" | "undo";
  actor: { role: "participant" | "organizer"; memberId: number | null };
  now: string;
};

/**
 * SETS the status (never toggles, BR-7) and logs it in one transaction (design §E).
 * A log row is written only if the status really changed, so a double tap logs once.
 * Returns the seat as it is now.
 */
export async function setSeatStatus(db: D1Database, change: StatusChange): Promise<SeatView> {
  const { seat, status, action, actor, now } = change;
  const readAt = status === "read" ? now : null;
  const results = await db.batch([
    db
      .prepare(
        "UPDATE seats SET status = ?, read_at = ?, updated_at = ? WHERE id = ? AND status <> ?",
      )
      .bind(status, readAt, now, seat.id, status),
    db
      .prepare(
        `INSERT INTO change_log (at, actor_role, actor_member_id, action, group_id, round_id, seat_id, juz)
         SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1`,
      )
      .bind(now, actor.role, actor.memberId, action, seat.groupId, seat.roundId, seat.id, seat.juz),
    db
      .prepare(
        `SELECT ${SEAT_VIEW_COLUMNS} FROM seats s LEFT JOIN members m ON m.id = s.member_id WHERE s.id = ?`,
      )
      .bind(seat.id),
  ]);
  const view = results[2]?.results[0] as SeatView | undefined;
  if (view === undefined) throw new Error("seat disappeared");
  return view;
}
