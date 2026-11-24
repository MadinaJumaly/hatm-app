import { JUZ_COUNT } from "./types.ts";
import { NAMES_MAX } from "./validation.ts";

export type SeatPlan = { juz: number; name: string | null };

/**
 * BR-2: name i reads juz i (in list order); juz N+1…30 are «Бос» (name null).
 * `names` must already be validated (validateNames).
 */
export function planSeats(names: readonly string[]): SeatPlan[] {
  if (names.length > NAMES_MAX) throw new RangeError(`at most ${String(NAMES_MAX)} names`);
  return Array.from({ length: JUZ_COUNT }, (_, index) => ({
    juz: index + 1,
    name: names[index] ?? null,
  }));
}

/** The Kazakh Cyrillic alphabet, in order (42 letters). */
const KAZAKH_ALPHABET = "аәбвгғдеёжзийкқлмнңоөпрстуұүфхһцчшщъыіьэюя";
const letterRank = new Map(Array.from(KAZAKH_ALPHABET).map((letter, index) => [letter, index]));

/**
 * Rank of one character: spaces and punctuation first (so "Айгүл А." comes before "Айгүлім"),
 * then Kazakh letters in alphabet order, then anything else (e.g. Latin) by code point.
 */
function charRank(char: string): number {
  const rank = letterRank.get(char);
  if (rank !== undefined) return 1_000 + rank;
  const codePoint = char.codePointAt(0) ?? 0;
  return /\p{L}/u.test(char) ? 2_000 + codePoint : codePoint;
}

/**
 * Sorts names A–Я in Kazakh alphabet order (name list, mockup 1), ignoring upper/lower case.
 * Our own rule on purpose: the Workers runtime and some phones don't know the Kazakh order.
 */
export function compareKazakh(a: string, b: string): number {
  const left = Array.from(a.toLowerCase());
  const right = Array.from(b.toLowerCase());
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const difference = charRank(left[i] ?? "") - charRank(right[i] ?? "");
    if (difference !== 0) return difference;
  }
  return left.length - right.length || (a < b ? -1 : a > b ? 1 : 0);
}
