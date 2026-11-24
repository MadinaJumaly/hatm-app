import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { buildKhatmSql, sqlText } from "../scripts/khatm-sql.ts";

describe("sqlText", () => {
  it("doubles single quotes, so a value can't end the string early", () => {
    expect(sqlText("О'Нил'); DROP TABLE seats; --")).toBe("'О''Нил''); DROP TABLE seats; --'");
  });
});

describe("buildKhatmSql (seed script)", () => {
  it("creates the group, round, members, 30 seats and a log row in the real schema", async () => {
    const sql = buildKhatmSql({
      title: "Жұма хатм — 'тест'",
      durationDays: 7,
      names: ["Айгүл А.", "О'Нил Д."],
      startDate: "2026-10-19",
      linkToken: "seed-test-token",
      now: "2026-10-19T05:00:00.000Z",
    });
    await env.DB.batch(
      sql
        .trim()
        .split("\n")
        .map((statement) => env.DB.prepare(statement)),
    );

    const group = await env.DB.prepare("SELECT id, title FROM groups WHERE link_token = ?")
      .bind("seed-test-token")
      .first<{ id: number; title: string }>();
    expect(group?.title).toBe("Жұма хатм — 'тест'");

    const round = await env.DB.prepare(
      "SELECT duration_days, start_date, deadline_date FROM rounds WHERE group_id = ?",
    )
      .bind(group?.id)
      .first();
    expect(round).toEqual({
      duration_days: 7,
      start_date: "2026-10-19",
      deadline_date: "2026-10-25",
    });

    const { results: seats } = await env.DB.prepare(
      `SELECT s.juz, m.display_name AS name FROM seats s
       JOIN rounds r ON r.id = s.round_id LEFT JOIN members m ON m.id = s.member_id
       WHERE r.group_id = ? ORDER BY s.juz`,
    )
      .bind(group?.id)
      .all<{ juz: number; name: string | null }>();
    expect(seats).toHaveLength(30);
    expect(seats.slice(0, 3)).toEqual([
      { juz: 1, name: "Айгүл А." },
      { juz: 2, name: "О'Нил Д." },
      { juz: 3, name: null },
    ]);

    const log = await env.DB.prepare("SELECT action FROM change_log WHERE group_id = ?")
      .bind(group?.id)
      .all();
    expect(log.results).toEqual([{ action: "create_khatm" }]);
  });
});
