import { JUZ_COUNT, type SeatDisplayStatus, type SeatStatus } from "./types.ts";

type SeatLike = { status: SeatStatus; memberId: number | null };

/** The status the UI shows for one seat (design §C: derived, never stored). */
export function seatDisplayStatus(seat: SeatLike, deadlinePassed: boolean): SeatDisplayStatus {
  if (seat.status === "read") return "read";
  if (seat.memberId === null) return "free"; // «Бос»: only the organizer can mark it
  return deadlinePassed ? "overdue" : "unread";
}

export type Progress = { read: number; total: number; finished: boolean };

/** "X / 30" and BR-6: the khatm is finished when all 30 juz are read. */
export function progress(seats: readonly Pick<SeatLike, "status">[]): Progress {
  const read = seats.filter((seat) => seat.status === "read").length;
  return { read, total: JUZ_COUNT, finished: read >= JUZ_COUNT };
}
