import type { RoundView } from "../../shared/api.ts";
import type { Duration } from "../../shared/types.ts";

export type GroupRow = { id: number; title: string; linkToken: string };
export type RoundRow = RoundView & { id: number };

/** Our link tokens are 16 random bytes as base64url = 22 characters. */
const LINK_TOKEN = /^[A-Za-z0-9_-]{22}$/;

export async function findGroupByToken(db: D1Database, token: string): Promise<GroupRow | null> {
  if (!LINK_TOKEN.test(token)) return null; // don't even ask the DB for a malformed token
  return db
    .prepare("SELECT id, title, link_token AS linkToken FROM groups WHERE link_token = ?")
    .bind(token)
    .first<GroupRow>();
}

export function findGroupById(db: D1Database, groupId: number): Promise<GroupRow | null> {
  return db
    .prepare("SELECT id, title, link_token AS linkToken FROM groups WHERE id = ?")
    .bind(groupId)
    .first<GroupRow>();
}

/** The group's current round: the one with the highest number. */
export async function findCurrentRound(db: D1Database, groupId: number): Promise<RoundRow | null> {
  const row = await db
    .prepare(
      `SELECT id, duration_days AS durationDays, deadline_date AS deadlineDate
       FROM rounds WHERE group_id = ? ORDER BY number DESC LIMIT 1`,
    )
    .bind(groupId)
    .first<{ id: number; durationDays: Duration; deadlineDate: string }>();
  return row;
}
