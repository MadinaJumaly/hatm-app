import { describe, expect, it } from "vitest";
import { progress, seatDisplayStatus } from "./progress.ts";

describe("seatDisplayStatus", () => {
  it("a read seat is read, even after the deadline", () => {
    expect(seatDisplayStatus({ status: "read", memberId: 1 }, true)).toBe("read");
  });

  it("an unread seat before the deadline is unread", () => {
    expect(seatDisplayStatus({ status: "unread", memberId: 1 }, false)).toBe("unread");
  });

  it("an unread seat after the deadline is overdue (BR-5)", () => {
    expect(seatDisplayStatus({ status: "unread", memberId: 1 }, true)).toBe("overdue");
  });

  it("a seat with no person is «Бос» (free)", () => {
    expect(seatDisplayStatus({ status: "unread", memberId: null }, false)).toBe("free");
    expect(seatDisplayStatus({ status: "unread", memberId: null }, true)).toBe("free");
  });

  it("a «Бос» seat marked by the organizer is read", () => {
    expect(seatDisplayStatus({ status: "read", memberId: null }, false)).toBe("read");
  });
});

describe("progress (X / 30, BR-6)", () => {
  const seats = (readCount: number) =>
    Array.from({ length: 30 }, (_, i) => ({
      status: i < readCount ? ("read" as const) : ("unread" as const),
    }));

  it("counts 0 / 30 for a new khatm", () => {
    expect(progress(seats(0))).toEqual({ read: 0, total: 30, finished: false });
  });

  it("29 / 30 is not finished", () => {
    expect(progress(seats(29))).toEqual({ read: 29, total: 30, finished: false });
  });

  it("30 / 30 is finished («Хатм аяқталды»)", () => {
    expect(progress(seats(30))).toEqual({ read: 30, total: 30, finished: true });
  });
});
