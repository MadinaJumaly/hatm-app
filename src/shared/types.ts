// Types shared by the browser and the Worker.

export const JUZ_COUNT = 30;

export const DURATIONS = [7, 15, 20, 30] as const;
export type Duration = (typeof DURATIONS)[number];

/** Stored seat status in v1 ('released' is v1.1). */
export type SeatStatus = "unread" | "read";

/** What the UI shows for a seat. Derived, never stored (design §C). */
export type SeatDisplayStatus = "read" | "unread" | "overdue" | "free";
