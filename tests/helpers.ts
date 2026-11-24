// Test helpers: create khatms in the local D1 and call the API like a browser would.
import { env, exports } from "cloudflare:workers";
import { buildKhatmSql } from "../scripts/khatm-sql.ts";
import { todayInKz } from "../src/shared/dates.ts";
import { randomToken } from "../src/shared/random.ts";
import type { Duration } from "../src/shared/types.ts";

export const ORIGIN = "https://hatm.test";

export const NAMES = ["Айгүл А.", "Нұрлан С.", "Бауыржан Т.", "Әлия Б.", "Серік А.", "Динара Ж."];

export async function seedKhatm(
  options: { names?: string[]; durationDays?: Duration; startDate?: string } = {},
) {
  const token = randomToken(16);
  const sql = buildKhatmSql({
    title: "Тест хатмы",
    durationDays: options.durationDays ?? 7,
    names: options.names ?? NAMES,
    startDate: options.startDate ?? todayInKz(new Date()),
    linkToken: token,
    now: new Date().toISOString(),
  });
  await env.DB.batch(
    sql
      .trim()
      .split("\n")
      .map((statement) => env.DB.prepare(statement)),
  );
  const group = await env.DB.prepare("SELECT id FROM groups WHERE link_token = ?")
    .bind(token)
    .first<{ id: number }>();
  if (!group) throw new Error("seed failed");
  return { token, groupId: group.id };
}

export async function memberId(groupId: number, name: string): Promise<number> {
  const row = await env.DB.prepare("SELECT id FROM members WHERE group_id = ? AND display_name = ?")
    .bind(groupId, name)
    .first<{ id: number }>();
  if (!row) throw new Error(`no member ${name}`);
  return row.id;
}

export async function seatOf(groupId: number, juz: number): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT s.id FROM seats s JOIN rounds r ON r.id = s.round_id WHERE r.group_id = ? AND s.juz = ?",
  )
    .bind(groupId, juz)
    .first<{ id: number }>();
  if (!row) throw new Error(`no seat ${String(juz)}`);
  return row.id;
}

/** A different fake IP for each caller, so per-IP limits in one test don't affect another. */
export function randomIp(): string {
  const part = () => String(Math.floor(Math.random() * 254) + 1);
  return `10.${part()}.${part()}.${part()}`;
}

type CallOptions = {
  method?: string;
  body?: unknown;
  cookie?: string;
  ip?: string;
  headers?: Record<string, string>;
};

/** Calls the Worker like our web app does: same Origin, JSON body. */
export function call(path: string, options: CallOptions = {}): Promise<Response> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const headers: Record<string, string> = {
    "CF-Connecting-IP": options.ip ?? "10.0.0.1",
    ...(method === "GET" ? {} : { Origin: ORIGIN, "Content-Type": "application/json" }),
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...options.headers,
  };
  return exports.default.fetch(`${ORIGIN}${path}`, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

/** "name=value" from the response's participant cookie, for the next request. */
export function sessionCookie(res: Response): string {
  const header = res.headers.get("Set-Cookie") ?? "";
  const match = /(__Host-hatm_p=[^;]*)/.exec(header);
  if (!match?.[1]) throw new Error(`no session cookie in: ${header}`);
  return match[1];
}

/** Creates the member's first PIN and returns the session cookie. */
export async function logIn(token: string, member: number, pin = "1234"): Promise<string> {
  const res = await call(`/api/g/${token}/login`, {
    body: { memberId: member, pin, pinConfirm: pin },
    ip: randomIp(),
  });
  if (res.status !== 200) throw new Error(`login failed: ${String(res.status)}`);
  return sessionCookie(res);
}

/** The test-only organizer login (see vitest.config.ts). */
export const ORGANIZER = { username: "test-organizer", password: "test-password-123" };

/** Logs in as the organizer and returns the session cookie. */
export async function logInOrganizer(): Promise<string> {
  const res = await call("/api/org/login", { body: ORGANIZER, ip: randomIp() });
  if (res.status !== 200) throw new Error(`organizer login failed: ${String(res.status)}`);
  const match = /(__Host-hatm_o=[^;]*)/.exec(res.headers.get("Set-Cookie") ?? "");
  if (!match?.[1]) throw new Error("no organizer cookie");
  return match[1];
}
