// Builds the SQL that creates one khatm (group + round 1 + members + 30 seats + log row).
// Used by seed-khatm.ts, which runs it with `wrangler d1 execute --file`.
//
// `wrangler d1 execute` can't bind parameters, so values are written into the SQL here.
// That is safe because: every text goes through sqlText() (SQLite strings have only one
// special character, the single quote, which it doubles), the title and names are validated
// first, and numbers are checked integers. The Worker itself always uses .prepare().bind().
import { deadlineDate } from "../src/shared/dates.ts";
import { planSeats } from "../src/shared/khatm.ts";
import type { Duration } from "../src/shared/types.ts";
import { nameKey } from "../src/shared/validation.ts";

export type KhatmInput = {
  title: string; // validated with validateTitle
  durationDays: Duration;
  names: string[]; // validated with validateNames
  startDate: string; // YYYY-MM-DD, Kazakhstan time
  linkToken: string;
  now: string; // ISO timestamp
};

export function sqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlInt(value: number): string {
  if (!Number.isSafeInteger(value)) throw new RangeError("not an integer");
  return String(value);
}

export function buildKhatmSql(input: KhatmInput): string {
  const now = sqlText(input.now);
  const token = sqlText(input.linkToken);
  const groupId = `(SELECT id FROM groups WHERE link_token = ${token})`;
  const roundId = `(SELECT id FROM rounds WHERE group_id = ${groupId} AND number = 1)`;
  const memberId = (name: string) =>
    `(SELECT id FROM members WHERE group_id = ${groupId} AND name_key = ${sqlText(nameKey(name))})`;

  const lines = [
    `INSERT INTO groups (title, link_token, created_at) VALUES (${sqlText(input.title)}, ${token}, ${now});`,
    `INSERT INTO rounds (group_id, number, duration_days, start_date, deadline_date, created_at) VALUES (${groupId}, 1, ${sqlInt(input.durationDays)}, ${sqlText(input.startDate)}, ${sqlText(deadlineDate(input.startDate, input.durationDays))}, ${now});`,
    ...input.names.map(
      (name) =>
        `INSERT INTO members (group_id, display_name, name_key, created_at) VALUES (${groupId}, ${sqlText(name)}, ${sqlText(nameKey(name))}, ${now});`,
    ),
    ...planSeats(input.names).map(
      (seat) =>
        `INSERT INTO seats (round_id, juz, member_id, updated_at) VALUES (${roundId}, ${sqlInt(seat.juz)}, ${seat.name === null ? "NULL" : memberId(seat.name)}, ${now});`,
    ),
    `INSERT INTO change_log (at, actor_role, action, group_id, round_id) VALUES (${now}, 'organizer', 'create_khatm', ${groupId}, ${roundId});`,
  ];
  return lines.join("\n") + "\n";
}
