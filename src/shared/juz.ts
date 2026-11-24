import { JUZ_COUNT } from "./types.ts";

export type PageRange = { first: number; last: number };

/**
 * BR-1: page range of a juz in the standard Medina mushaf (604 pages).
 * Juz 1 = 1–21, juz n (2…29) = 20n−18 … 20n+1, juz 30 = 582–604.
 */
export function juzPages(juz: number): PageRange {
  if (!Number.isInteger(juz) || juz < 1 || juz > JUZ_COUNT) {
    throw new RangeError(`juz must be an integer from 1 to ${String(JUZ_COUNT)}`);
  }
  if (juz === 1) return { first: 1, last: 21 };
  if (juz === JUZ_COUNT) return { first: 582, last: 604 };
  return { first: 20 * juz - 18, last: 20 * juz + 1 };
}
