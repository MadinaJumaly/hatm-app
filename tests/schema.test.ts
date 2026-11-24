import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

// Tests for the rules inside migrations/0001_init.sql. They run against a real local D1.

const NOW = "2026-10-21T08:00:00.000Z";
let tokenCounter = 0;

async function insertGroup(title = "Тест хатмы"): Promise<number> {
  tokenCounter += 1;
  const row = await env.DB.prepare(
    "INSERT INTO groups (title, link_token, created_at) VALUES (?, ?, ?) RETURNING id",
  )
    .bind(title, `token-${String(tokenCounter)}`, NOW)
    .first<{ id: number }>();
  if (!row) throw new Error("group not inserted");
  return row.id;
}

async function insertRound(groupId: number, durationDays = 7): Promise<number> {
  const row = await env.DB.prepare(
    `INSERT INTO rounds (group_id, number, duration_days, start_date, deadline_date, created_at)
     VALUES (?, 1, ?, '2026-10-21', '2026-10-27', ?) RETURNING id`,
  )
    .bind(groupId, durationDays, NOW)
    .first<{ id: number }>();
  if (!row) throw new Error("round not inserted");
  return row.id;
}

function insertMember(groupId: number, name: string) {
  return env.DB.prepare(
    "INSERT INTO members (group_id, display_name, name_key, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(groupId, name, name.toLowerCase(), NOW)
    .run();
}

function insertSeat(roundId: number, juz: number, status = "unread") {
  return env.DB.prepare("INSERT INTO seats (round_id, juz, status, updated_at) VALUES (?, ?, ?, ?)")
    .bind(roundId, juz, status, NOW)
    .run();
}

function insertLog() {
  return env.DB.prepare(
    "INSERT INTO change_log (at, actor_role, action, group_id) VALUES (?, 'organizer', 'mark', 1)",
  )
    .bind(NOW)
    .run();
}

describe("change_log is append-only (S-1)", () => {
  it("accepts new rows", async () => {
    const result = await insertLog();
    expect(result.meta.changes).toBe(1);
  });

  it("refuses UPDATE", async () => {
    await insertLog();
    await expect(env.DB.prepare("UPDATE change_log SET action = 'unmark'").run()).rejects.toThrow(
      /append-only/,
    );
  });

  it("refuses DELETE", async () => {
    await insertLog();
    await expect(env.DB.prepare("DELETE FROM change_log").run()).rejects.toThrow(/append-only/);
  });

  it("refuses an unknown action", async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO change_log (at, actor_role, action) VALUES (?, 'organizer', 'hack')",
      )
        .bind(NOW)
        .run(),
    ).rejects.toThrow(/CHECK/);
  });
});

describe("members", () => {
  it("refuses a duplicate name in the same group (decision 6)", async () => {
    const groupId = await insertGroup();
    await insertMember(groupId, "Айгүл А.");
    await expect(insertMember(groupId, "АЙГҮЛ А.")).rejects.toThrow(/UNIQUE/);
  });

  it("allows the same name in another group", async () => {
    await insertMember(await insertGroup(), "Айгүл А.");
    const result = await insertMember(await insertGroup(), "Айгүл А.");
    expect(result.meta.changes).toBe(1);
  });

  it("refuses a name longer than 40 characters", async () => {
    await expect(insertMember(await insertGroup(), "А".repeat(41))).rejects.toThrow(/CHECK/);
  });
});

describe("groups and rounds", () => {
  it("refuses a title longer than 80 characters", async () => {
    await expect(insertGroup("Х".repeat(81))).rejects.toThrow(/CHECK/);
  });

  it("refuses a duration that is not 7 / 15 / 20 / 30", async () => {
    const groupId = await insertGroup();
    await expect(insertRound(groupId, 10)).rejects.toThrow(/CHECK/);
  });

  it("refuses a round for a group that doesn't exist (foreign key)", async () => {
    await expect(insertRound(999_999)).rejects.toThrow(/FOREIGN KEY/);
  });
});

describe("seats", () => {
  it.each([0, 31])("refuses juz %i", async (juz) => {
    const roundId = await insertRound(await insertGroup());
    await expect(insertSeat(roundId, juz)).rejects.toThrow(/CHECK/);
  });

  it("refuses the same juz twice in one round", async () => {
    const roundId = await insertRound(await insertGroup());
    await insertSeat(roundId, 5);
    await expect(insertSeat(roundId, 5)).rejects.toThrow(/UNIQUE/);
  });

  it("refuses an unknown status", async () => {
    const roundId = await insertRound(await insertGroup());
    await expect(insertSeat(roundId, 1, "done")).rejects.toThrow(/CHECK/);
  });
});

describe("sessions", () => {
  function insertSession(role: string, memberId: number | null) {
    return env.DB.prepare(
      "INSERT INTO sessions (token_hash, role, member_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(`hash-${role}-${String(memberId)}`, role, memberId, NOW, NOW)
      .run();
  }

  it("refuses a participant session without a member", async () => {
    await expect(insertSession("participant", null)).rejects.toThrow(/CHECK/);
  });

  it("refuses an organizer session tied to a member", async () => {
    const groupId = await insertGroup();
    await insertMember(groupId, "Бауыржан Т.");
    await expect(insertSession("organizer", 1)).rejects.toThrow(/CHECK/);
  });

  it("accepts an organizer session without a member", async () => {
    const result = await insertSession("organizer", null);
    expect(result.meta.changes).toBe(1);
  });
});
