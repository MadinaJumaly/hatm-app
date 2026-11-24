// All stored times are UTC ISO-8601 strings, so they compare correctly as text (BR-3).

export const nowIso = (now: Date = new Date()) => now.toISOString();

export const minutesFrom = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString();

export const daysFrom = (iso: string, days: number) => minutesFrom(iso, days * 24 * 60);

/** Whole seconds from `nowIso` until `untilIso` (at least 1), for `retryAfter`. */
export const secondsUntil = (untilIso: string, now: string) =>
  Math.max(1, Math.ceil((Date.parse(untilIso) - Date.parse(now)) / 1000));
