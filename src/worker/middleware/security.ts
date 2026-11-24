import { bodyLimit } from "hono/body-limit";
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../app-env.ts";
import { apiError } from "../lib/http.ts";

// Same values as public/_headers (static files), plus no caching of API answers (design §I).
const HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
  "Cache-Control": "no-store",
};

export const securityHeaders = createMiddleware<AppEnv>(async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(HEADERS)) c.res.headers.set(name, value);
});

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY_BYTES = 10 * 1024;

/**
 * For every request that changes data (design §D, threat T6 CSRF):
 * the Origin must be our own site (403), the body must be JSON (415) and at most 10 KB (413).
 */
export const writeGuard = createMiddleware<AppEnv>(async (c, next) => {
  if (!WRITE_METHODS.has(c.req.method)) return next();

  if (c.req.header("Origin") !== new URL(c.req.url).origin) return apiError(c, 403, "bad_origin");

  const contentType = c.req.header("Content-Type") ?? "";
  if (!/^application\/json(;|$)/i.test(contentType)) {
    return apiError(c, 415, "unsupported_media_type");
  }
  return limitBody(c, next);
});

const limitBody = bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) => c.json({ code: "payload_too_large" }, 413),
});
