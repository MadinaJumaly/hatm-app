import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import type {
  CreateKhatmResponse,
  OrgGroupsView,
  OrgGroupView,
  SeatView,
} from "../src/shared/api.ts";
import worker from "../src/worker/index.ts";
import {
  call,
  logIn,
  logInOrganizer,
  memberId,
  NAMES,
  ORGANIZER,
  ORIGIN,
  randomIp,
  seatOf,
  seedKhatm,
} from "./helpers.ts";

// Iteration 2: organizer API #6–#12 (O-1…O-7).

/** The organizer lock is one account-wide key, so each test starts without old failures. */
async function clearOrganizerLock() {
  await env.DB.prepare("DELETE FROM auth_failures WHERE key = 'org'").run();
}

const orgLogin = (body: object, ip = randomIp()) => call("/api/org/login", { body, ip });

describe("POST /api/org/login (API #6, O-1)", () => {
  it("logs in with the right username and password: secure 30-day cookie", async () => {
    await clearOrganizerLock();
    const res = await orgLogin(ORGANIZER);
    expect(res.status).toBe(200);
    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toMatch(/^__Host-hatm_o=[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain(`Max-Age=${String(30 * 24 * 60 * 60)}`);
  });

  it("gives the same answer for a wrong username and a wrong password", async () => {
    await clearOrganizerLock();
    const wrongUser = await orgLogin({ ...ORGANIZER, username: "admin" });
    const wrongPassword = await orgLogin({ ...ORGANIZER, password: "nope-nope" });
    expect([wrongUser.status, wrongPassword.status]).toEqual([401, 401]);
    expect(await wrongUser.text()).toBe(await wrongPassword.text());
    expect(await (await orgLogin({ ...ORGANIZER, password: "x" })).json()).toEqual({
      code: "wrong_login",
    });
  });

  it("locks the login for 15 minutes after 5 failures, even for the right password", async () => {
    await clearOrganizerLock();
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await orgLogin({ ...ORGANIZER, password: "wrong-guess" })).status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429]);
    const right = await orgLogin(ORGANIZER);
    expect(right.status).toBe(429);
    expect((await right.json<{ code: string; retryAfter: number }>()).code).toBe("locked");
    await clearOrganizerLock();
  });

  it("forgets earlier failures after a successful login", async () => {
    await clearOrganizerLock();
    for (let i = 0; i < 4; i++) await orgLogin({ ...ORGANIZER, password: "wrong-guess" });
    expect((await orgLogin(ORGANIZER)).status).toBe(200);
    expect((await orgLogin({ ...ORGANIZER, password: "wrong-guess" })).status).toBe(401);
    expect((await orgLogin(ORGANIZER)).status).toBe(200);
  });

  it.each([
    {},
    { username: "a" },
    { username: 1, password: 2 },
    { username: "a", password: "x".repeat(201) },
  ])("refuses %j with 400", async (body) => {
    expect((await orgLogin(body)).status).toBe(400);
  });
});

describe("POST /api/org/login with a bad secret", () => {
  /** Logs in against the Worker with some env values changed, e.g. a badly pasted secret. */
  function orgLoginWithEnv(changes: Partial<Cloudflare.Env>) {
    const request = new Request(`${ORIGIN}/api/org/login`, {
      method: "POST",
      headers: {
        Origin: ORIGIN,
        "Content-Type": "application/json",
        "CF-Connecting-IP": randomIp(),
      },
      body: JSON.stringify(ORGANIZER),
    });
    return worker.fetch(request, { ...env, ...changes });
  }

  it("refuses the login (401) and logs the cause when ORGANIZER_PASSWORD_HASH is malformed", async () => {
    await clearOrganizerLock();
    const cut = env.ORGANIZER_PASSWORD_HASH.slice(0, 30); // e.g. a double-click copied only part
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const res = await orgLoginWithEnv({ ORGANIZER_PASSWORD_HASH: cut });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ code: "wrong_login" });
      expect(errors).toHaveBeenCalledWith("ORGANIZER_PASSWORD_HASH is malformed");
      const logged = errors.mock.calls.flat().map(String).join(" ");
      expect(logged).not.toContain(cut);
      expect(logged).not.toContain(ORGANIZER.password);
    } finally {
      errors.mockRestore();
      await clearOrganizerLock();
    }
  });

  it("still answers 500 for other server faults, e.g. a missing PEPPER", async () => {
    await clearOrganizerLock();
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const res = await orgLoginWithEnv({ PEPPER: "" });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ code: "server_error" });
    } finally {
      errors.mockRestore();
    }
  });
});

describe("organizer-only routes", () => {
  const routes: [string, string, object?][] = [
    ["GET", "/api/org/groups"],
    ["GET", "/api/org/groups/1"],
    ["PUT", "/api/org/seats/1/status", { read: true }],
    ["DELETE", "/api/org/members/1/pin", {}],
    ["POST", "/api/org/khatms", { title: "x", durationDays: 7, names: ["Айгүл А."] }],
  ];

  it.each(routes)("%s %s needs an organizer session (401)", async (method, path, body) => {
    const res = await call(path, { method, ...(body ? { body } : {}) });
    expect(res.status).toBe(401);
  });

  it.each(routes)("%s %s refuses a participant session (401)", async (method, path, body) => {
    const { token, groupId } = await seedKhatm();
    const cookie = await logIn(token, await memberId(groupId, "Айгүл А."));
    const res = await call(path, { method, cookie, ...(body ? { body } : {}) });
    expect(res.status).toBe(401);
  });

  it("ends the session on logout (API #7)", async () => {
    await clearOrganizerLock();
    const cookie = await logInOrganizer();
    expect((await call("/api/org/groups", { cookie })).status).toBe(200);
    const out = await call("/api/org/logout", { body: {}, cookie });
    expect(out.status).toBe(200);
    expect(out.headers.get("Set-Cookie")).toMatch(/__Host-hatm_o=;.*Max-Age=0/);
    expect((await call("/api/org/groups", { cookie })).status).toBe(401);
  });
});

describe("groups (API #8, #9)", () => {
  it("lists every group with its deadline, progress and full link, newest first", async () => {
    await clearOrganizerLock();
    const cookie = await logInOrganizer();
    const older = await seedKhatm();
    const newer = await seedKhatm({ durationDays: 15 });
    const mySeat = await seatOf(newer.groupId, 1);
    await env.DB.prepare("UPDATE seats SET status = 'read' WHERE id = ?").bind(mySeat).run();

    const body = await (await call("/api/org/groups", { cookie })).json<OrgGroupsView>();
    const ids = body.groups.map((g) => g.id);
    expect(ids.indexOf(newer.groupId)).toBeLessThan(ids.indexOf(older.groupId));
    expect(body.groups.find((g) => g.id === newer.groupId)).toMatchObject({
      title: "Тест хатмы",
      link: `${ORIGIN}/g/${newer.token}`,
      durationDays: 15,
      read: 1,
      total: 30,
    });
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shows one group: link, round, 30 seats and who has a PIN", async () => {
    await clearOrganizerLock();
    const cookie = await logInOrganizer();
    const { token, groupId } = await seedKhatm();
    await logIn(token, await memberId(groupId, "Нұрлан С."));

    const res = await call(`/api/org/groups/${String(groupId)}`, { cookie });
    const body = await res.json<OrgGroupView>();
    expect(body.link).toBe(`${ORIGIN}/g/${token}`);
    expect(body.seats).toHaveLength(30);
    expect(body.seats[1]).toMatchObject({ juz: 2, name: "Нұрлан С.", status: "unread" });
    expect(body.members.find((m) => m.name === "Нұрлан С.")?.hasPin).toBe(true);
    expect(body.members.find((m) => m.name === "Айгүл А.")?.hasPin).toBe(false);
    expect(JSON.stringify(body)).not.toContain("pbkdf2");
  });

  it("answers 404 for a group that doesn't exist", async () => {
    await clearOrganizerLock();
    const cookie = await logInOrganizer();
    for (const id of ["999999", "abc", "0"]) {
      expect((await call(`/api/org/groups/${id}`, { cookie })).status).toBe(404);
    }
  });
});

describe("mark / unmark on behalf (API #10, O-4)", () => {
  async function setup() {
    await clearOrganizerLock();
    const cookie = await logInOrganizer();
    const { groupId } = await seedKhatm();
    const put = (seatId: number | string, body: object) =>
      call(`/api/org/seats/${String(seatId)}/status`, { method: "PUT", body, cookie });
    return { groupId, put };
  }

  async function log(groupId: number) {
    const { results } = await env.DB.prepare(
      "SELECT action, actor_role, actor_member_id FROM change_log WHERE group_id = ? AND seat_id IS NOT NULL ORDER BY id",
    )
      .bind(groupId)
      .all();
    return results;
  }

  it("marks anyone's juz and logs it as the organizer", async () => {
    const { groupId, put } = await setup();
    const res = await put(await seatOf(groupId, 2), { read: true });
    expect(res.status).toBe(200);
    expect((await res.json<{ seat: SeatView }>()).seat).toMatchObject({ juz: 2, status: "read" });
    expect(await log(groupId)).toEqual([
      { action: "mark", actor_role: "organizer", actor_member_id: null },
    ]);
  });

  it("works for a «Бос» juz too, and unmarks", async () => {
    const { groupId, put } = await setup();
    const free = await seatOf(groupId, 30);
    expect((await put(free, { read: true })).status).toBe(200);
    expect((await put(free, { read: false })).status).toBe(200);
    expect((await log(groupId)).map((row) => row.action)).toEqual(["mark", "unmark"]);
  });

  it("refuses bad input (400) and unknown seats (404)", async () => {
    const { groupId, put } = await setup();
    expect((await put(await seatOf(groupId, 1), { read: "yes" })).status).toBe(400);
    expect((await put("abc", { read: true })).status).toBe(400);
    expect((await put(999_999, { read: true })).status).toBe(404);
  });
});

describe("PIN reset (API #11, O-6)", () => {
  it("deletes the PIN, clears the lock, ends all the member's sessions, and logs it", async () => {
    await clearOrganizerLock();
    const cookie = await logInOrganizer();
    const { token, groupId } = await seedKhatm();
    const aigul = await memberId(groupId, "Айгүл А.");
    const phone = await logIn(token, aigul);
    await env.DB.prepare("UPDATE members SET pin_fail_count = 3, pin_locked_until = ? WHERE id = ?")
      .bind(new Date(Date.now() + 60_000).toISOString(), aigul)
      .run();

    const res = await call(`/api/org/members/${String(aigul)}/pin`, {
      method: "DELETE",
      body: {},
      cookie,
    });
    expect(res.status).toBe(200);

    const row = await env.DB.prepare(
      "SELECT pin_hash, pin_fail_count, pin_locked_until FROM members WHERE id = ?",
    )
      .bind(aigul)
      .first();
    expect(row).toEqual({ pin_hash: null, pin_fail_count: 0, pin_locked_until: null });
    expect((await call("/api/me", { cookie: phone })).status).toBe(401);
    const logRow = await env.DB.prepare(
      "SELECT actor_role FROM change_log WHERE group_id = ? AND action = 'pin_reset'",
    )
      .bind(groupId)
      .first();
    expect(logRow).toEqual({ actor_role: "organizer" });

    // Next visit is a first visit again (P-1).
    const again = await call(`/api/g/${token}/login`, {
      body: { memberId: aigul, pin: "4444", pinConfirm: "4444" },
      ip: randomIp(),
    });
    expect(again.status).toBe(200);
  });

  it("answers 404 for an unknown member", async () => {
    await clearOrganizerLock();
    const cookie = await logInOrganizer();
    const res = await call("/api/org/members/999999/pin", { method: "DELETE", body: {}, cookie });
    expect(res.status).toBe(404);
  });
});

describe("create a khatm (API #12, O-7)", () => {
  async function create(body: object) {
    await clearOrganizerLock();
    const cookie = await logInOrganizer();
    return call("/api/org/khatms", { body, cookie });
  }

  it("creates the group, members and 30 seats (BR-2) and returns the link", async () => {
    const res = await create({
      title: "  Жұма хатмы — 3-топ ",
      durationDays: 20,
      names: ["Айгүл А.", "", "  Нұрлан   С. "],
    });
    expect(res.status).toBe(201);
    const { groupId, link } = await res.json<CreateKhatmResponse>();
    expect(link).toMatch(new RegExp(`^${ORIGIN}/g/[A-Za-z0-9_-]{22}$`));

    const group = await env.DB.prepare(
      "SELECT g.title, r.duration_days, r.start_date, r.deadline_date FROM groups g JOIN rounds r ON r.group_id = g.id WHERE g.id = ?",
    )
      .bind(groupId)
      .first<{ title: string; duration_days: number; start_date: string; deadline_date: string }>();
    expect(group?.title).toBe("Жұма хатмы — 3-топ");
    expect(group?.duration_days).toBe(20);

    const { results: seats } = await env.DB.prepare(
      `SELECT s.juz, m.display_name AS name FROM seats s JOIN rounds r ON r.id = s.round_id
       LEFT JOIN members m ON m.id = s.member_id WHERE r.group_id = ? ORDER BY s.juz`,
    )
      .bind(groupId)
      .all<{ juz: number; name: string | null }>();
    expect(seats).toHaveLength(30);
    expect(seats.slice(0, 3)).toEqual([
      { juz: 1, name: "Айгүл А." },
      { juz: 2, name: "Нұрлан С." },
      { juz: 3, name: null },
    ]);

    const log = await env.DB.prepare("SELECT action, actor_role FROM change_log WHERE group_id = ?")
      .bind(groupId)
      .all();
    expect(log.results).toEqual([{ action: "create_khatm", actor_role: "organizer" }]);
  });

  it("accepts exactly 30 names", async () => {
    const names = Array.from({ length: 30 }, (_, i) => `${NAMES[0] ?? ""} ${"а".repeat(i + 1)}`);
    expect((await create({ title: "Толық", durationDays: 7, names })).status).toBe(201);
  });

  it.each([
    [{ title: "", durationDays: 7, names: ["Айгүл А."] }, { title: "required" }],
    [{ title: "х".repeat(81), durationDays: 7, names: ["Айгүл А."] }, { title: "too_long" }],
    [{ title: "Хатм", durationDays: 10, names: ["Айгүл А."] }, { durationDays: "invalid" }],
    [{ title: "Хатм", durationDays: 7, names: [] }, { names: { code: "empty" } }],
    [
      {
        title: "Хатм",
        durationDays: 7,
        names: Array.from({ length: 31 }, (_, i) => `А ${"б".repeat(i + 1)}`),
      },
      { names: { code: "too_many", count: 31 } },
    ],
    [
      { title: "Хатм", durationDays: 7, names: ["Айгүл А.", "а".repeat(41)] },
      { names: { code: "too_long", line: 2 } },
    ],
    [
      { title: "Хатм", durationDays: 7, names: ["Айгүл А.", "Нұрлан С.", "айгүл а."] },
      { names: { code: "duplicate", line: 3, firstLine: 1 } },
    ],
    [
      { title: "Хатм", durationDays: 7, names: ["<script>"] },
      { names: { code: "bad_chars", line: 1 } },
    ],
  ])("refuses %j with field errors %j and saves nothing", async (body, fields) => {
    const before = await env.DB.prepare("SELECT count(*) AS n FROM groups").first<{ n: number }>();
    const res = await create(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ code: "invalid", fields });
    const after = await env.DB.prepare("SELECT count(*) AS n FROM groups").first<{ n: number }>();
    expect(after?.n).toBe(before?.n);
  });

  it("reports all wrong fields at once", async () => {
    const res = await create({ title: "", durationDays: 3, names: [] });
    expect(await res.json()).toEqual({
      code: "invalid",
      fields: { title: "required", durationDays: "invalid", names: { code: "empty" } },
    });
  });
});
