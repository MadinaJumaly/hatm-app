import { texts } from "./texts.kk.ts";

// Kazakh date formats from the mockups. Dates are "YYYY-MM-DD" in Kazakhstan time.

function parts(date: string): { day: number; month: number; weekday: number } {
  const utc = new Date(`${date}T00:00:00Z`);
  return { day: utc.getUTCDate(), month: utc.getUTCMonth(), weekday: utc.getUTCDay() };
}

/** "25 қазан, жексенбі" (home card). */
export function formatDeadline(date: string): string {
  const { day, month, weekday } = parts(date);
  return `${String(day)} ${texts.months[month] ?? ""}, ${texts.weekdays[weekday] ?? ""}`;
}

/** "25 қазан" (organizer groups list, mockup 5). */
export function formatDayMonth(date: string): string {
  const { day, month } = parts(date);
  return `${String(day)} ${texts.months[month] ?? ""}`;
}

/** "25 қазанға" (name list: "7 күн · 25 қазанға дейін"). */
export function formatUntil(date: string): string {
  const { day, month } = parts(date);
  return `${String(day)} ${texts.monthsUntil[month] ?? ""}`;
}

/** "бүгін 14:32", or "20 қазан, 14:32" when it wasn't today (saved data shown offline). */
export function formatUpdatedAt(moment: Date, now: Date): string {
  const kz = (d: Date) => new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const day = kz(moment);
  const when = day === kz(now) ? texts.today : `${formatDayMonth(day)},`;
  return `${when} ${formatKzTime(moment)}`;
}

/** "14:32" in Kazakhstan time (UTC+5), whatever the phone's time zone. */
export function formatKzTime(moment: Date): string {
  return new Date(moment.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(11, 16);
}
