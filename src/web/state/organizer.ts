import { batch, computed, signal, type Signal } from "@preact/signals";
import type {
  CreateKhatmRequest,
  CreateKhatmResponse,
  KhatmFieldErrors,
  OrgGroupsView,
  OrgGroupView,
  SeatView,
} from "../../shared/api.ts";
import { deadlineState } from "../../shared/dates.ts";
import { progress, seatDisplayStatus } from "../../shared/progress.ts";
import { api, type ApiResult } from "../api.ts";
import { errorText } from "../errors.ts";
import { texts } from "../texts.kk.ts";

// State of the organizer app (design §K). One signal per seat, as for participants.

export type Session = "checking" | "loggedOut" | "loggedIn";

export const session = signal<Session>("checking");
export const groups = signal<OrgGroupsView | null>(null);
export const pageError = signal<string | null>(null);

export const group = signal<Omit<OrgGroupView, "seats"> | null>(null);
export const seatIds = signal<number[]>([]);
const seats = new Map<number, Signal<SeatView>>();
export const seat = (id: number) => seats.get(id);

export const onlyUnread = signal(false);
export const sheetSeatId = signal<number | null>(null);
export const busy = signal(false);
/** Short message after an action, read out by screen readers. */
export const notice = signal<string | null>(null);

const deadlinePassed = computed(() => {
  const current = group.value;
  return current
    ? deadlineState(current.round.deadlineDate, current.today).kind === "overdue"
    : false;
});

export const groupProgress = computed(() =>
  progress(seatIds.value.map((id) => seats.get(id)?.value ?? { status: "unread" as const })),
);

/** «Тек оқылмағандар»: every seat that isn't read (also «Бос» and overdue ones, O-3). */
export const unreadIds = computed(() =>
  seatIds.value.filter((id) => seats.get(id)?.value.status !== "read"),
);

export const visibleIds = computed(() => (onlyUnread.value ? unreadIds.value : seatIds.value));

export function displayStatus(value: SeatView) {
  return seatDisplayStatus(value, deadlinePassed.value);
}

function handleAuthError(result: Extract<ApiResult<unknown>, { ok: false }>): boolean {
  if (result.error.code !== "no_session") return false;
  session.value = "loggedOut";
  return true;
}

/** Loads the groups list; also tells whether the organizer is logged in. */
export async function loadGroups(): Promise<void> {
  const result = await api.get<OrgGroupsView>("/api/org/groups");
  if (result.ok) {
    batch(() => {
      groups.value = result.data;
      session.value = "loggedIn";
      pageError.value = null;
    });
  } else if (!handleAuthError(result)) {
    pageError.value = errorText(result);
    if (session.value === "checking") session.value = "loggedIn";
  }
}

export async function loadGroup(id: number): Promise<void> {
  const result = await api.get<OrgGroupView>(`/api/org/groups/${String(id)}`);
  if (!result.ok) {
    if (!handleAuthError(result)) {
      pageError.value = result.status === 404 ? texts.org.notFound : errorText(result);
      if (session.value === "checking") session.value = "loggedIn";
    }
    return;
  }
  const { seats: list, ...rest } = result.data;
  batch(() => {
    seats.clear();
    for (const item of list) seats.set(item.id, signal(item));
    group.value = rest;
    seatIds.value = list.map((item) => item.id);
    session.value = "loggedIn";
    pageError.value = null;
  });
}

export type LoginResult = { ok: true } | { ok: false; message: string };

export async function login(username: string, password: string): Promise<LoginResult> {
  const result = await api.post("/api/org/login", { username, password });
  if (result.ok) {
    session.value = "loggedIn";
    return { ok: true };
  }
  const message = result.error.code === "wrong_login" ? texts.org.wrongLogin : errorText(result);
  return { ok: false, message };
}

export async function logout(): Promise<void> {
  await api.post("/api/org/logout");
  batch(() => {
    session.value = "loggedOut";
    groups.value = null;
    group.value = null;
  });
}

export function openSheet(seatId: number): void {
  notice.value = null;
  sheetSeatId.value = seatId;
}

export function closeSheet(): void {
  sheetSeatId.value = null;
}

/** O-4: mark / unmark on someone's behalf. Returns an error text, or null on success. */
export async function setStatus(seatId: number, read: boolean): Promise<string | null> {
  busy.value = true;
  const result = await api.put<{ seat: SeatView }>(`/api/org/seats/${String(seatId)}/status`, {
    read,
  });
  busy.value = false;
  if (!result.ok) return handleAuthError(result) ? null : errorText(result);
  const target = seats.get(seatId);
  if (target) target.value = result.data.seat;
  notice.value = read
    ? texts.org.markedOnBehalf(result.data.seat.juz)
    : texts.org.unmarkedOnBehalf(result.data.seat.juz);
  return null;
}

/** O-6: reset a forgotten PIN. Returns an error text, or null on success. */
export async function resetPin(memberId: number, name: string): Promise<string | null> {
  busy.value = true;
  const result = await api.del(`/api/org/members/${String(memberId)}/pin`);
  busy.value = false;
  if (!result.ok) return handleAuthError(result) ? null : errorText(result);
  const current = group.value;
  if (current) {
    group.value = {
      ...current,
      members: current.members.map((m) => (m.id === memberId ? { ...m, hasPin: false } : m)),
    };
  }
  notice.value = texts.org.pinResetDone(name);
  return null;
}

export type CreateResult =
  { ok: true; groupId: number } | { ok: false; fields?: KhatmFieldErrors; message?: string };

/** O-7: create a khatm. */
export async function createKhatm(request: CreateKhatmRequest): Promise<CreateResult> {
  const result = await api.post<CreateKhatmResponse>("/api/org/khatms", request);
  if (result.ok) {
    notice.value = texts.org.created;
    return { ok: true, groupId: result.data.groupId };
  }
  if (handleAuthError(result)) return { ok: false };
  const { error } = result;
  if (error.code === "invalid" && "fields" in error) {
    return { ok: false, fields: error.fields };
  }
  return { ok: false, message: errorText(result) };
}
