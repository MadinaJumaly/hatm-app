import type { ApiResult } from "./api.ts";
import { texts } from "./texts.kk.ts";

/** Error text for a failed request. */
export function errorText(result: Extract<ApiResult<unknown>, { ok: false }>): string {
  const { error } = result;
  if (error.code === "offline") return texts.offline;
  if (error.code === "forbidden") return texts.forbidden;
  if ((error.code === "locked" || error.code === "too_many") && "retryAfter" in error) {
    return texts.tryLater(Math.ceil((error.retryAfter ?? 900) / 60));
  }
  return texts.serverError;
}
