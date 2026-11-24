import { describe, expect, it } from "vitest";
import { addDays, deadlineDate, deadlineState, todayInKz } from "./dates.ts";

describe("todayInKz (BR-3: UTC+5)", () => {
  it("is still the same day at 23:59:59 in Kazakhstan", () => {
    expect(todayInKz(new Date("2026-10-21T18:59:59.999Z"))).toBe("2026-10-21");
  });

  it("is the next day at 00:00 in Kazakhstan (19:00 UTC)", () => {
    expect(todayInKz(new Date("2026-10-21T19:00:00.000Z"))).toBe("2026-10-22");
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles 29 February in a leap year", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it.each(["2026-13-01", "21.10.2026", "", "2026-10-21T00:00:00Z"])(
    "throws for a bad date %j",
    (date) => {
      expect(() => addDays(date, 1)).toThrow(RangeError);
    },
  );
});

describe("deadlineDate (decision 3)", () => {
  it("7 days created on Monday ends on Sunday", () => {
    expect(deadlineDate("2026-10-19", 7)).toBe("2026-10-25");
  });

  it.each([
    [15, "2026-11-04"],
    [20, "2026-11-09"],
    [30, "2026-11-19"],
  ] as const)("%i days from 21.10 ends on %s", (duration, expected) => {
    expect(deadlineDate("2026-10-21", duration)).toBe(expected);
  });
});

describe("deadlineState (BR-4, BR-5)", () => {
  const deadline = "2026-10-27";

  it("on the start day of a 7-day khatm, 7 days are left", () => {
    expect(deadlineState(deadline, "2026-10-21")).toEqual({ kind: "open", daysLeft: 7 });
  });

  it("the day before the deadline, 2 days are left", () => {
    expect(deadlineState(deadline, "2026-10-26")).toEqual({ kind: "open", daysLeft: 2 });
  });

  it("on the deadline day itself, it is the last day", () => {
    expect(deadlineState(deadline, "2026-10-27")).toEqual({ kind: "lastDay" });
  });

  it("the day after the deadline, it is overdue", () => {
    expect(deadlineState(deadline, "2026-10-28")).toEqual({ kind: "overdue" });
  });
});
