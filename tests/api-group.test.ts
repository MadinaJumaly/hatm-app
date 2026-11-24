import { describe, expect, it } from "vitest";
import type { GroupPublicView } from "../src/shared/api.ts";
import { call, logIn, memberId, seedKhatm } from "./helpers.ts";

// T1.2: API #1 (name list) and API #13 (per-group manifest).

describe("GET /api/g/:token (API #1)", () => {
  it("returns the title, round and members A–Я with their juz", async () => {
    const { token } = await seedKhatm({ names: ["Нұрлан С.", "Әлия Б.", "Айгүл А."] });
    const res = await call(`/api/g/${token}`);
    expect(res.status).toBe(200);
    const body = await res.json<GroupPublicView>();
    expect(body.title).toBe("Тест хатмы");
    expect(body.round.durationDays).toBe(7);
    expect(body.members.map((m) => [m.name, m.juz, m.hasPin])).toEqual([
      ["Айгүл А.", 3, false],
      ["Әлия Б.", 2, false],
      ["Нұрлан С.", 1, false],
    ]);
  });

  it("shows hasPin after a member created a PIN, but never the PIN hash", async () => {
    const { token, groupId } = await seedKhatm();
    await logIn(token, await memberId(groupId, "Айгүл А."));
    const text = await (await call(`/api/g/${token}`)).text();
    const body = JSON.parse(text) as GroupPublicView;
    expect(body.members.find((m) => m.name === "Айгүл А.")?.hasPin).toBe(true);
    expect(text).not.toContain("pbkdf2");
  });

  it("gives every bad link the same 404 answer", async () => {
    const answers = await Promise.all(
      ["AAAAAAAAAAAAAAAAAAAAAA", "short", "x".repeat(200), "' OR 1=1 --"].map(async (bad) => {
        const res = await call(`/api/g/${encodeURIComponent(bad)}`);
        return [res.status, await res.text()];
      }),
    );
    expect(new Set(answers.map((a) => JSON.stringify(a)))).toEqual(
      new Set([JSON.stringify([404, '{"code":"bad_link"}'])]),
    );
  });
});

describe("GET /g/:token/manifest.webmanifest (API #13)", () => {
  it("returns a manifest that starts the installed app on this group", async () => {
    const { token } = await seedKhatm();
    const res = await call(`/g/${token}/manifest.webmanifest`);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/manifest+json");
    const manifest = await res.json<{ icons: object[] }>();
    expect(manifest).toMatchObject({
      name: "Хатм — Тест хатмы",
      short_name: "Хатм",
      lang: "kk",
      display: "standalone",
      start_url: `/g/${token}`,
      scope: "/",
    });
    expect(manifest.icons).toContainEqual({
      src: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    });
    expect(manifest.icons).toContainEqual({
      src: "/icons/maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    });
  });

  it("returns 404 for a bad link", async () => {
    const res = await call("/g/AAAAAAAAAAAAAAAAAAAAAA/manifest.webmanifest");
    expect(res.status).toBe(404);
  });
});
