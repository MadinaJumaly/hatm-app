import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiError, ErrorCode } from "../../shared/api.ts";
import type { AppContext } from "../app-env.ts";

/** Every error response has the same shape: `{ code, …extra }` (design §D). */
export function apiError(
  c: AppContext,
  status: ContentfulStatusCode,
  code: ErrorCode,
  extra: Omit<ApiError, "code"> = {},
) {
  return c.json<ApiError>({ code, ...extra }, status);
}

/** The request body as JSON, or undefined when it isn't valid JSON. */
export async function readJson(c: AppContext): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A positive whole number from a path parameter, or null. */
export function parseId(text: string | undefined): number | null {
  if (text === undefined || !/^[1-9]\d{0,9}$/.test(text)) return null;
  return Number(text);
}
