// Request and response shapes of the API (design §D), shared by the browser and the Worker.
import type { Duration, SeatStatus } from "./types.ts";
import type { NamesError, TitleError } from "./validation.ts";

export type ErrorCode =
  | "bad_link"
  | "invalid"
  | "pin_mismatch"
  | "wrong_pin"
  | "wrong_login"
  | "pin_already_set"
  | "locked"
  | "too_many"
  | "no_session"
  | "forbidden"
  | "bad_origin"
  | "unsupported_media_type"
  | "payload_too_large"
  | "not_found"
  | "server_error";

export type ApiError = {
  code: ErrorCode;
  triesLeft?: number;
  /** Seconds until the user may try again. */
  retryAfter?: number;
  /** API #12: which form fields are wrong, as codes the app turns into Kazakh texts. */
  fields?: KhatmFieldErrors;
};

export type RoundView = { durationDays: Duration; deadlineDate: string };

/** API #1: what anyone with the group link sees (the name list). */
export type GroupPublicView = {
  title: string;
  round: RoundView;
  members: { id: number; name: string; juz: number | null; hasPin: boolean }[];
};

/** API #2 request. `pinConfirm` is required when the member has no PIN yet. */
export type LoginRequest = { memberId: number; pin: string; pinConfirm?: string };

export type SeatView = {
  id: number;
  juz: number;
  memberId: number | null;
  name: string | null;
  status: SeatStatus;
  readAt: string | null;
};

/** API #3: the participant's home screen. */
export type MeView = {
  group: { title: string; linkToken: string };
  round: RoundView;
  /** Today in Kazakhstan, from the server clock. */
  today: string;
  me: { memberId: number; name: string; seatId: number | null };
  seats: SeatView[];
};

/** API #4 request: sets (never toggles) the status (BR-7). */
export type SeatStatusRequest = { read: boolean; via?: "undo" };

// ── Organizer (API #6–#12) ───────────────────────────────────────────────────

export type OrgLoginRequest = { username: string; password: string };

/** API #8: all groups with their progress, newest first. */
export type OrgGroupsView = {
  today: string;
  groups: {
    id: number;
    title: string;
    link: string;
    durationDays: Duration;
    deadlineDate: string;
    read: number;
    total: number;
  }[];
};

/** API #9: one group with every seat (who, status) and whether each member has a PIN. */
export type OrgGroupView = {
  id: number;
  title: string;
  link: string;
  round: RoundView;
  today: string;
  seats: SeatView[];
  members: { id: number; name: string; hasPin: boolean }[];
};

/** API #12 request. `names` are the raw textarea lines, so error line numbers match. */
export type CreateKhatmRequest = { title: string; durationDays: number; names: string[] };

export type KhatmFieldErrors = {
  title?: TitleError;
  durationDays?: "invalid";
  names?: NamesError;
};

export type CreateKhatmResponse = { groupId: number; link: string };
