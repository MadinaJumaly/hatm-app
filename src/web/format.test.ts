import { describe, expect, it } from "vitest";
import {
  formatDayMonth,
  formatDeadline,
  formatKzTime,
  formatUntil,
  formatUpdatedAt,
} from "./format.ts";

describe("Kazakh date formats", () => {
  it("formats the deadline with month and weekday, as in mockup 3", () => {
    expect(formatDeadline("2026-10-25")).toBe("25 қазан, жексенбі");
    expect(formatDeadline("2026-10-21")).toBe("21 қазан, сәрсенбі");
    expect(formatDeadline("2027-01-01")).toBe("1 қаңтар, жұма");
  });

  it("formats the name-list date in the 'until' form, as in mockup 1", () => {
    expect(formatUntil("2026-10-25")).toBe("25 қазанға");
    expect(formatUntil("2026-04-03")).toBe("3 сәуірге");
    expect(formatUntil("2026-09-30")).toBe("30 қыркүйекке");
  });

  it("formats day and month, as in mockup 5", () => {
    expect(formatDayMonth("2026-10-25")).toBe("25 қазан");
  });

  it("says «бүгін» for today, or the date for older saved data", () => {
    const now = new Date("2026-10-22T10:00:00Z");
    expect(formatUpdatedAt(new Date("2026-10-22T09:32:00Z"), now)).toBe("бүгін 14:32");
    expect(formatUpdatedAt(new Date("2026-10-21T18:59:00Z"), now)).toBe("21 қазан, 23:59");
  });

  it("shows the time in Kazakhstan (UTC+5)", () => {
    expect(formatKzTime(new Date("2026-10-21T09:32:00Z"))).toBe("14:32");
    expect(formatKzTime(new Date("2026-10-21T19:05:00Z"))).toBe("00:05");
  });
});
