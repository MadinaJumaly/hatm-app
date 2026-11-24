import type { Duration } from "./types.ts";

// Dates are calendar days in Kazakhstan time (UTC+5, no daylight saving), as "YYYY-MM-DD" (BR-3).

const KZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in Kazakhstan for a given moment. */
export function todayInKz(now: Date): string {
  return new Date(now.getTime() + KZ_OFFSET_MS).toISOString().slice(0, 10);
}

function toUtcMs(date: string): number {
  const ms = ISO_DATE.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN;
  if (Number.isNaN(ms)) throw new RangeError("date must be YYYY-MM-DD");
  return ms;
}

export function addDays(date: string, days: number): string {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Decision 3: the deadline is start day + (duration − 1) days, at 23:59 Kazakhstan time. */
export function deadlineDate(startDate: string, durationDays: Duration): string {
  return addDays(startDate, durationDays - 1);
}

export type DeadlineState =
  | { kind: "open"; daysLeft: number } // daysLeft ≥ 2
  | { kind: "lastDay" } // «Бүгін соңғы күн»
  | { kind: "overdue" }; // «Мерзімі өтті»

/** BR-4 / BR-5: days left = (deadline − today) + 1. On the deadline day itself: last day. */
export function deadlineState(deadline: string, today: string): DeadlineState {
  const daysLeft = Math.round((toUtcMs(deadline) - toUtcMs(today)) / DAY_MS) + 1;
  if (daysLeft <= 0) return { kind: "overdue" };
  if (daysLeft === 1) return { kind: "lastDay" };
  return { kind: "open", daysLeft };
}
