import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, memberId, randomIp, seedKhatm, sessionCookie } from "./helpers.ts";

// T1.3: API #2 — PIN create / check, sessions, per-name and per-IP limits, PIN race (P-1, §E, §F).

async function setup() {
  const { token, groupId } = await seedKhatm();
  const aigul = await memberId(groupId, "Айгүл А.");
  const login = (body: object, ip = randomIp()) =>
    call(`/api/g/${token}/login`, { body: { memberId: aigul, ...body }, ip });
  return { token, groupId, aigul, login };
}

async function pinRow(id: number) {
  return env.DB.prepare(
    "SELECT pin_hash, pin_fail_count, pin_locked_until FROM members WHERE id = ?",
  )
    .bind(id)
    .first<{ pin_hash: string | null; pin_fail_count: number; pin_locked_until: string | null }>();
}

describe("first visit: create a PIN", () => {
  it("saves a hashed PIN, logs pin_set, and sets a secure 1-year session cookie", async () => {
    const { aigul, groupId, login } = await setup();
    const res = await login({ pin: "0000", pinConfirm: "0000" });
    expect(res.status).toBe(200);

    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toMatch(/^__Host-hatm_p=[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=31536000");

    expect((await pinRow(aigul))?.pin_hash).toMatch(/^pbkdf2\$sha256\$/);
    const log = await env.DB.prepare(
      "SELECT action, actor_role, actor_member_id FROM change_log WHERE group_id = ? AND action = 'pin_set'",
    )
      .bind(groupId)
      .all();
    expect(log.results).toEqual([
      { action: "pin_set", actor_role: "participant", actor_member_id: aigul },
    ]);
  });

  it("stores only a hash of the session token", async () => {
    const { login } = await setup();
    const token = sessionCookie(await login({ pin: "1234", pinConfirm: "1234" })).split("=")[1];
    const row = await env.DB.prepare("SELECT count(*) AS n FROM sessions WHERE token_hash = ?")
      .bind(token)
      .first<{ n: number }>();
    expect(row?.n).toBe(0);
  });

  it("refuses two different PINs (400 pin_mismatch) and saves nothing", async () => {
    const { aigul, login } = await setup();
    const res = await login({ pin: "1234", pinConfirm: "1243" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ code: "pin_mismatch" });
    expect((await pinRow(aigul))?.pin_hash).toBeNull();
  });

  it("needs the PIN twice when there is no PIN yet (400)", async () => {
    const { login } = await setup();
    expect((await login({ pin: "1234" })).status).toBe(400);
  });

  it("lets only one of two people racing for the same name set the PIN (409)", async () => {
    const { login } = await setup();
    const results = await Promise.all([
      login({ pin: "1111", pinConfirm: "1111" }),
      login({ pin: "2222", pinConfirm: "2222" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const loser = results.find((r) => r.status === 409);
    expect(await loser?.json()).toEqual({ code: "pin_already_set" });
  });
});

describe("name already taken", () => {
  it("answers 409 to a PIN-create request when the name has a PIN, without counting a failure", async () => {
    const { aigul, login } = await setup();
    await login({ pin: "1111", pinConfirm: "1111" });
    const res = await login({ pin: "2222", pinConfirm: "2222" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ code: "pin_already_set" });
    expect((await pinRow(aigul))?.pin_fail_count).toBe(0);
  });
});

describe("next visits: log in with the PIN", () => {
  it("accepts the right PIN", async () => {
    const { login } = await setup();
    await login({ pin: "1234", pinConfirm: "1234" });
    expect((await login({ pin: "1234" })).status).toBe(200);
  });

  it("refuses a wrong PIN with 401 and the number of tries left", async () => {
    const { login } = await setup();
    await login({ pin: "1234", pinConfirm: "1234" });
    const res = await login({ pin: "9999" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ code: "wrong_pin", triesLeft: 4 });
  });

  it("locks the name for 15 minutes on the 5th wrong PIN, even for the right PIN", async () => {
    const { login } = await setup();
    await login({ pin: "1234", pinConfirm: "1234" });
    const tries = [];
    for (let i = 0; i < 5; i++) tries.push(await login({ pin: "9999" }));
    expect(tries.slice(0, 4).map((r) => r.status)).toEqual([401, 401, 401, 401]);
    expect(tries[4]?.status).toBe(429);
    const locked = await tries[4]?.json<{ code: string; retryAfter: number }>();
    expect(locked?.code).toBe("locked");
    expect(locked?.retryAfter).toBeGreaterThan(890);
    expect(locked?.retryAfter).toBeLessThanOrEqual(900);

    const right = await login({ pin: "1234" });
    expect(right.status).toBe(429);
  });

  it("lets the person in again after the lock ends, with a fresh count", async () => {
    const { aigul, login } = await setup();
    await login({ pin: "1234", pinConfirm: "1234" });
    for (let i = 0; i < 5; i++) await login({ pin: "9999" });
    await env.DB.prepare("UPDATE members SET pin_locked_until = ? WHERE id = ?")
      .bind(new Date(Date.now() - 1000).toISOString(), aigul)
      .run();

    const wrong = await login({ pin: "9999" });
    expect(await wrong.json()).toEqual({ code: "wrong_pin", triesLeft: 4 });
    expect((await login({ pin: "1234" })).status).toBe(200);
    expect(await pinRow(aigul)).toMatchObject({ pin_fail_count: 0, pin_locked_until: null });
  });

  it("can't lose counts when many wrong PINs arrive at once", async () => {
    const { aigul, login } = await setup();
    await login({ pin: "1234", pinConfirm: "1234" });
    await Promise.all(Array.from({ length: 4 }, () => login({ pin: "9999" })));
    expect((await pinRow(aigul))?.pin_fail_count).toBe(4);
  });
});

describe("per-IP limit", () => {
  it("blocks an IP for 15 minutes after 20 wrong PINs, across different names", async () => {
    const { token, groupId } = await seedKhatm();
    const ip = randomIp();
    const ids = await Promise.all(
      ["Айгүл А.", "Нұрлан С.", "Бауыржан Т.", "Әлия Б.", "Серік А."].map((n) =>
        memberId(groupId, n),
      ),
    );
    for (const id of ids) {
      await call(`/api/g/${token}/login`, {
        body: { memberId: id, pin: "1234", pinConfirm: "1234" },
      });
    }
    for (const id of ids) {
      for (let i = 0; i < 4; i++) {
        await call(`/api/g/${token}/login`, { body: { memberId: id, pin: "9999" }, ip });
      }
    }
    const blocked = await call(`/api/g/${token}/login`, {
      body: { memberId: await memberId(groupId, "Динара Ж."), pin: "1234", pinConfirm: "1234" },
      ip,
    });
    expect(blocked.status).toBe(429);
    expect((await blocked.json<{ code: string }>()).code).toBe("too_many");

    const otherIp = await call(`/api/g/${token}/login`, {
      body: { memberId: await memberId(groupId, "Динара Ж."), pin: "1234", pinConfirm: "1234" },
      ip: randomIp(),
    });
    expect(otherIp.status).toBe(200);
  });

  it("never stores the IP address itself", async () => {
    const { login } = await setup();
    await login({ pin: "1234", pinConfirm: "1234" });
    await login({ pin: "9999" }, "10.9.8.7");
    const rows = await env.DB.prepare("SELECT key FROM auth_failures").all<{ key: string }>();
    expect(rows.results.some((r) => r.key.includes("10.9.8.7"))).toBe(false);
    expect(rows.results.some((r) => /^ip:[0-9a-f]{64}$/.test(r.key))).toBe(true);
  });
});

describe("bad requests", () => {
  it.each([
    [{ pin: "12a4", pinConfirm: "12a4" }],
    [{ pin: "123", pinConfirm: "123" }],
    [{ pin: 1234, pinConfirm: 1234 }],
    [{ memberId: "1", pin: "1234", pinConfirm: "1234" }],
  ])("refuses %j with 400", async (body) => {
    const { login } = await setup();
    expect((await login(body)).status).toBe(400);
  });

  it("refuses a member of another group (400)", async () => {
    const { token } = await seedKhatm();
    const other = await seedKhatm();
    const stranger = await memberId(other.groupId, "Айгүл А.");
    const res = await call(`/api/g/${token}/login`, {
      body: { memberId: stranger, pin: "1234", pinConfirm: "1234" },
      ip: randomIp(),
    });
    expect(res.status).toBe(400);
  });

  it("refuses a bad link (404)", async () => {
    const res = await call("/api/g/AAAAAAAAAAAAAAAAAAAAAA/login", {
      body: { memberId: 1, pin: "1234", pinConfirm: "1234" },
    });
    expect(res.status).toBe(404);
  });
});
