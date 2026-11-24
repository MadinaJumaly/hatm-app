import { describe, expect, it } from "vitest";
import { juzPages } from "./juz.ts";

describe("juzPages (BR-1)", () => {
  it.each([
    [1, 1, 21],
    [2, 22, 41],
    [12, 222, 241],
    [29, 562, 581],
    [30, 582, 604],
  ])("juz %i is pages %i–%i", (juz, first, last) => {
    expect(juzPages(juz)).toEqual({ first, last });
  });

  it("covers all 604 pages with no gaps or overlaps", () => {
    let nextPage = 1;
    for (let juz = 1; juz <= 30; juz++) {
      const { first, last } = juzPages(juz);
      expect(first).toBe(nextPage);
      nextPage = last + 1;
    }
    expect(nextPage - 1).toBe(604);
  });

  it.each([0, 31, 1.5, Number.NaN])("throws for juz %s", (juz) => {
    expect(() => juzPages(juz)).toThrow(RangeError);
  });
});
