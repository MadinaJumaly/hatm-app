import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { call, ORIGIN, seedKhatm } from "./helpers.ts";

// T1.8: security headers and the write guard (design §D, §I; threats T6 CSRF, T5 XSS).

describe("security headers on API responses", () => {
  it("sets CSP, HSTS, no-referrer, nosniff, noindex and no-store", async () => {
    const res = await call("/api/nope");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(res.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("also sets them on errors from real routes", async () => {
    const res = await call("/api/g/AAAAAAAAAAAAAAAAAAAAAA");
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("write guard (every POST / PUT / DELETE)", () => {
  const post = (headers: Record<string, string>, body = "{}") =>
    exports.default.fetch(`${ORIGIN}/api/logout`, { method: "POST", headers, body });

  it("refuses a request without an Origin header (403)", async () => {
    const res = await post({ "Content-Type": "application/json" });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: "bad_origin" });
  });

  it("refuses a request from another site (403)", async () => {
    const res = await post({ Origin: "https://evil.example", "Content-Type": "application/json" });
    expect(res.status).toBe(403);
  });

  it("refuses a body that is not JSON, like a plain HTML form (415)", async () => {
    const res = await post({ Origin: ORIGIN, "Content-Type": "application/x-www-form-urlencoded" });
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ code: "unsupported_media_type" });
  });

  it("refuses a body bigger than 10 KB (413)", async () => {
    const big = JSON.stringify({ pad: "x".repeat(11 * 1024) });
    const res = await post({ Origin: ORIGIN, "Content-Type": "application/json" }, big);
    expect(res.status).toBe(413);
  });

  it("accepts JSON from our own origin", async () => {
    const res = await post({ Origin: ORIGIN, "Content-Type": "application/json; charset=utf-8" });
    expect(res.status).toBe(200);
  });

  it("does not apply to GET requests", async () => {
    const { token } = await seedKhatm();
    const res = await exports.default.fetch(`${ORIGIN}/api/g/${token}`);
    expect(res.status).toBe(200);
  });
});
