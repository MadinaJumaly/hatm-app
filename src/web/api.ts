import type { ApiError, ErrorCode } from "../shared/api.ts";

// Small fetch wrapper: same origin, JSON in and out. Never throws: every call returns a result,
// and "no internet" is its own error code, so screens can show «Интернет жоқ».

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; error: ApiError | { code: "offline" } };

export type ClientErrorCode = ErrorCode | "offline";

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: { code: "offline" } };
  }
  const json: unknown = await res.json().catch(() => null);
  if (res.ok) return { ok: true, data: json as T };
  const error =
    typeof json === "object" && json !== null && "code" in json
      ? (json as ApiError)
      : ({ code: "server_error" } as const);
  return { ok: false, status: res.status, error };
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path, {}),
};
