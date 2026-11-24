import { DURATIONS, type Duration } from "./types.ts";

// Input rules shared by the browser (form preview) and the Worker (the real check).
// Errors are codes, not texts: the UI turns them into Kazakh messages (texts.kk.ts).

export const TITLE_MAX = 80;
export const NAME_MAX = 40;
export const NAMES_MAX = 30;
/** Hard cap on raw lines, so a huge request can't make the server loop for long. */
const RAW_LINES_MAX = 200;

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const ok = <T>(value: T) => ({ ok: true, value }) as const;
const fail = <E>(error: E) => ({ ok: false, error }) as const;

/** Letters of any language (incl. Kazakh), combining marks, space, dot, hyphen, apostrophe. */
const NAME_CHARS = /^[\p{L}\p{M} .'-]+$/u;
const HAS_LETTER = /\p{L}/u;
/** Phones often type a "smart" apostrophe (‘ ’ ʼ) instead of '. */
const APOSTROPHES = /[\u2018\u2019\u02BC]/g;

/**
 * Length in characters (code points), on purpose: it matches SQLite's length(),
 * which the database CHECK rules for the 40 / 80 limits use.
 */
const charLength = (text: string) => Array.from(text).length;

/**
 * Normalizes user text: Unicode NFC, any whitespace → one space, control and invisible
 * format characters removed (e.g. right-to-left override), trimmed.
 */
export function cleanText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/\s/gu, " ")
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Key used to refuse duplicate names (case-insensitive). Same as members.name_key. */
export function nameKey(name: string): string {
  return cleanText(name).toLowerCase();
}

export type TitleError = "required" | "too_long";

export function validateTitle(input: unknown): Result<string, TitleError> {
  if (typeof input !== "string") return fail("required");
  const title = cleanText(input);
  if (title === "") return fail("required");
  if (charLength(title) > TITLE_MAX) return fail("too_long");
  return ok(title);
}

export function validateDuration(input: unknown): Result<Duration, "invalid"> {
  const found = DURATIONS.find((duration) => duration === input);
  return found === undefined ? fail("invalid") : ok(found);
}

/** Any 4 digits, including simple ones like 0000 (requirements P-1). ASCII digits only. */
export function isValidPin(input: unknown): input is string {
  return typeof input === "string" && /^\d{4}$/.test(input);
}

export type NamesError =
  | { code: "invalid" }
  | { code: "empty" }
  | { code: "too_many"; count: number }
  | { code: "too_long"; line: number }
  | { code: "bad_chars"; line: number }
  | { code: "duplicate"; line: number; firstLine: number };

/**
 * O-7: names list, one per line. `lines` are the raw textarea lines, so error line numbers
 * match what the organizer sees. Empty lines are skipped. Returns the first error found.
 */
export function validateNames(lines: unknown): Result<string[], NamesError> {
  if (!Array.isArray(lines)) return fail({ code: "invalid" });
  if (lines.length > RAW_LINES_MAX) return fail({ code: "too_many", count: lines.length });
  const names: string[] = [];
  const firstLineByKey = new Map<string, number>();

  for (const [index, raw] of lines.entries()) {
    if (typeof raw !== "string") return fail({ code: "invalid" });
    const line = index + 1;
    const name = cleanText(raw).replace(APOSTROPHES, "'");
    if (name === "") continue;
    if (charLength(name) > NAME_MAX) return fail({ code: "too_long", line });
    if (!NAME_CHARS.test(name) || !HAS_LETTER.test(name)) return fail({ code: "bad_chars", line });

    const key = nameKey(name);
    const firstLine = firstLineByKey.get(key);
    if (firstLine !== undefined) return fail({ code: "duplicate", line, firstLine });
    firstLineByKey.set(key, line);
    names.push(name);
  }

  if (names.length === 0) return fail({ code: "empty" });
  if (names.length > NAMES_MAX) return fail({ code: "too_many", count: names.length });
  return ok(names);
}
