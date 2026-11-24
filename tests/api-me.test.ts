import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { MeView, SeatView } from "../src/shared/api.ts";
import { call, logIn, memberId, seatOf, seedKhatm } from "./helpers.ts";

// T1.4 (API #3), T1.5 (API #4) and T1.7 (API #5).

async function loggedIn() {
  const { token, groupId } = await seedKhatm();
  const aigul = await memberId(groupId, "Айгүл А."); // juz 1
  const cookie = await logIn(token, aigul);
  const setStatus = (seatId: number | string, body: object) =>
    call(`/api/me/seats/${String(seatId)}/status`, { method: "PUT", body, cookie });
  return { token, groupId, aigul, cookie, setStatus, mySeat: await seatOf(groupId, 1) };
}

async function logActions(groupId: number) {
  const { results } = await env.DB.prepare(
    "SELECT action FROM change_log WHERE group_id = ? AND seat_id IS NOT NULL ORDER BY id",
  )
    .bind(groupId)
    .all<{ action: string }>();
  return results.map((r) => r.action);
}

describe("GET /api/me (API #3)", () => {
  it("needs a session (401)", async () => {
    const res = await call("/api/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: "no_session" });
  });

  it("returns the group, round, today, my seat and all 30 seats", async () => {
    const { token, cookie, aigul, mySeat } = await loggedIn();
    const body = await (await call("/api/me", { cookie })).json<MeView>();
    expect(body.group).toEqual({ title: "Тест хатмы", linkToken: token });
    expect(body.round.durationDays).toBe(7);
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.me).toEqual({ memberId: aigul, name: "Айгүл А.", seatId: mySeat });
    expect(body.seats).toHaveLength(30);
    expect(body.seats[0]).toMatchObject({
      juz: 1,
      name: "Айгүл А.",
      status: "unread",
      readAt: null,
    });
    expect(body.seats[29]).toMatchObject({ juz: 30, name: null, memberId: null });
  });

  it("refuses an expired session", async () => {
    const { cookie } = await loggedIn();
    await env.DB.prepare("UPDATE sessions SET expires_at = ?")
      .bind(new Date(Date.now() - 1000).toISOString())
      .run();
    expect((await call("/api/me", { cookie })).status).toBe(401);
  });
});

describe("PUT /api/me/seats/:seatId/status (API #4)", () => {
  it("marks my juz as read and logs 'mark'", async () => {
    const { setStatus, mySeat, groupId } = await loggedIn();
    const res = await setStatus(mySeat, { read: true });
    expect(res.status).toBe(200);
    const { seat } = await res.json<{ seat: SeatView }>();
    expect(seat).toMatchObject({ id: mySeat, juz: 1, status: "read" });
    expect(seat.readAt).not.toBeNull();
    expect(await logActions(groupId)).toEqual(["mark"]);
  });

  it("a double tap leaves it read and logs once (BR-7)", async () => {
    const { setStatus, mySeat, groupId } = await loggedIn();
    const [first, second] = await Promise.all([
      setStatus(mySeat, { read: true }),
      setStatus(mySeat, { read: true }),
    ]);
    expect([first.status, second.status]).toEqual([200, 200]);
    expect(await logActions(groupId)).toEqual(["mark"]);
  });

  it("undo and remove mark set it back to unread, logged as 'undo' and 'unmark'", async () => {
    const { setStatus, mySeat, groupId } = await loggedIn();
    await setStatus(mySeat, { read: true });
    const undo = await (
      await setStatus(mySeat, { read: false, via: "undo" })
    ).json<{ seat: SeatView }>();
    expect(undo.seat).toMatchObject({ status: "unread", readAt: null });
    await setStatus(mySeat, { read: true });
    await setStatus(mySeat, { read: false });
    expect(await logActions(groupId)).toEqual(["mark", "undo", "mark", "unmark"]);
  });

  it("refuses someone else's juz (403) and changes nothing (threat T1)", async () => {
    const { setStatus, groupId } = await loggedIn();
    const othersSeat = await seatOf(groupId, 2);
    const res = await setStatus(othersSeat, { read: true });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: "forbidden" });
    const row = await env.DB.prepare("SELECT status FROM seats WHERE id = ?")
      .bind(othersSeat)
      .first<{ status: string }>();
    expect(row?.status).toBe("unread");
    expect(await logActions(groupId)).toEqual([]);
  });

  it("refuses a «Бос» juz, a seat in another group, and a seat that doesn't exist (403)", async () => {
    const { setStatus, groupId } = await loggedIn();
    const other = await seedKhatm();
    for (const seatId of [await seatOf(groupId, 30), await seatOf(other.groupId, 1), 999_999]) {
      expect((await setStatus(seatId, { read: true })).status).toBe(403);
    }
  });

  it.each([
    ["abc", { read: true }],
    ["1", { read: "yes" }],
    ["1", { read: true, via: "undo" }],
    ["1", {}],
  ])("refuses seat %s with body %j (400)", async (seatId, body) => {
    const { setStatus } = await loggedIn();
    expect((await setStatus(seatId, body)).status).toBe(400);
  });

  it("needs a session (401)", async () => {
    const { mySeat } = await loggedIn();
    const res = await call(`/api/me/seats/${String(mySeat)}/status`, {
      method: "PUT",
      body: { read: true },
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/logout (API #5) and sessions", () => {
  it("ends the session on the server and clears the cookie", async () => {
    const { cookie } = await loggedIn();
    const res = await call("/api/logout", { body: {}, cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toMatch(/__Host-hatm_p=;.*Max-Age=0/);
    expect((await call("/api/me", { cookie })).status).toBe(401);
  });

  it("answers 200 even without a session", async () => {
    expect((await call("/api/logout", { body: {} })).status).toBe(200);
  });

  it("logging in again on the same device replaces the old session", async () => {
    const { token, groupId, cookie } = await loggedIn();
    const nurlan = await memberId(groupId, "Нұрлан С.");
    const res = await call(`/api/g/${token}/login`, {
      body: { memberId: nurlan, pin: "4321", pinConfirm: "4321" },
      cookie,
    });
    expect(res.status).toBe(200);
    expect((await call("/api/me", { cookie })).status).toBe(401);
  });
});
