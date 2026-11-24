import { describe, expect, it } from "vitest";
import {
  cleanText,
  isValidPin,
  nameKey,
  validateDuration,
  validateNames,
  validateTitle,
} from "./validation.ts";

const names = (count: number) =>
  Array.from({ length: count }, (_, i) => `Адам ${"а".repeat(i + 1)}`);

describe("cleanText", () => {
  it("trims and collapses spaces, tabs and newlines", () => {
    expect(cleanText("  Айгүл \t  А.\n")).toBe("Айгүл А.");
  });

  it("removes control characters and invisible format characters", () => {
    // U+202E (right-to-left override), U+200B (zero-width space), U+0007 (bell)
    expect(cleanText("Ай\u202Eгүл\u200B\u0007")).toBe("Айгүл");
  });

  it("normalizes to NFC, so the same letter is always stored the same way", () => {
    expect(cleanText("и\u0306")).toBe("й");
  });
});

describe("nameKey", () => {
  it("is case-insensitive, including Kazakh letters", () => {
    expect(nameKey("ӘЛИЯ Б.")).toBe(nameKey("әлия б."));
  });
});

describe("validateTitle", () => {
  it("accepts and cleans a normal title", () => {
    expect(validateTitle("  Рамазан  хатмы ")).toEqual({ ok: true, value: "Рамазан хатмы" });
  });

  it("accepts exactly 80 characters", () => {
    expect(validateTitle("х".repeat(80)).ok).toBe(true);
  });

  it("refuses 81 characters", () => {
    expect(validateTitle("х".repeat(81))).toEqual({ ok: false, error: "too_long" });
  });

  it.each(["", "   ", "\u200B", 42, null, undefined])("refuses %j as empty", (input) => {
    expect(validateTitle(input)).toEqual({ ok: false, error: "required" });
  });
});

describe("validateDuration", () => {
  it.each([7, 15, 20, 30])("accepts %i", (days) => {
    expect(validateDuration(days)).toEqual({ ok: true, value: days });
  });

  it.each([0, 8, 31, "7", null])("refuses %j", (input) => {
    expect(validateDuration(input)).toEqual({ ok: false, error: "invalid" });
  });
});

describe("isValidPin", () => {
  it.each(["0000", "1234", "9999"])("accepts %s", (pin) => {
    expect(isValidPin(pin)).toBe(true);
  });

  it.each(["123", "12345", "12a4", " 1234", "1234\n", "١٢٣٤", 1234, null])("refuses %j", (pin) => {
    expect(isValidPin(pin)).toBe(false);
  });
});

describe("validateNames (O-7)", () => {
  it("accepts Kazakh names and skips empty lines and extra spaces", () => {
    expect(validateNames(["Айгүл А.", "", "  Нұрлан   С. ", "   "])).toEqual({
      ok: true,
      value: ["Айгүл А.", "Нұрлан С."],
    });
  });

  it("accepts hyphens and apostrophes, and turns a phone's smart apostrophe into '", () => {
    expect(validateNames(["Анна-Мария К.", "О\u2019Нил Д."])).toEqual({
      ok: true,
      value: ["Анна-Мария К.", "О'Нил Д."],
    });
  });

  it("accepts exactly 30 names", () => {
    expect(validateNames(names(30)).ok).toBe(true);
  });

  it("refuses 31 names", () => {
    expect(validateNames(names(31))).toEqual({ ok: false, error: { code: "too_many", count: 31 } });
  });

  it("refuses 0 names", () => {
    expect(validateNames([])).toEqual({ ok: false, error: { code: "empty" } });
    expect(validateNames(["", "  "])).toEqual({ ok: false, error: { code: "empty" } });
  });

  it("accepts a 40-character name and refuses a 41-character one, naming the line", () => {
    expect(validateNames(["а".repeat(40)]).ok).toBe(true);
    expect(validateNames(["Айгүл А.", "", "а".repeat(41)])).toEqual({
      ok: false,
      error: { code: "too_long", line: 3 },
    });
  });

  it("refuses duplicates case-insensitively, naming both lines", () => {
    expect(validateNames(["Айгүл А.", "Нұрлан С.", "айгүл а."])).toEqual({
      ok: false,
      error: { code: "duplicate", line: 3, firstLine: 1 },
    });
  });

  it("treats names that differ only in spaces as duplicates", () => {
    expect(validateNames(["Айгүл А.", "Айгүл   А."])).toEqual({
      ok: false,
      error: { code: "duplicate", line: 2, firstLine: 1 },
    });
  });

  it.each(["<script>", "Айгүл1", "a@b", "...", "- '"])(
    "refuses %j (not allowed characters, or no letter)",
    (bad) => {
      expect(validateNames(["Айгүл А.", bad])).toEqual({
        ok: false,
        error: { code: "bad_chars", line: 2 },
      });
    },
  );

  it("refuses input that is not a list of strings", () => {
    expect(validateNames("Айгүл А.")).toEqual({ ok: false, error: { code: "invalid" } });
    expect(validateNames(["Айгүл А.", 5])).toEqual({ ok: false, error: { code: "invalid" } });
  });

  it("refuses a huge number of raw lines before looking at them", () => {
    expect(validateNames(Array.from({ length: 201 }, () => ""))).toEqual({
      ok: false,
      error: { code: "too_many", count: 201 },
    });
  });
});
