import { batch, computed, signal, type Signal } from "@preact/signals";
import type { GroupPublicView, MeView, SeatView } from "../../shared/api.ts";
import { deadlineState } from "../../shared/dates.ts";
import { progress } from "../../shared/progress.ts";
import { api } from "../api.ts";
import { errorText } from "../errors.ts";
import { clearHome, readHome, saveHome } from "../offlineCache.ts";
import { texts } from "../texts.kk.ts";

// State of the participant app (design §K). One signal per seat, so a change re-renders only
// that row and the counter, never the whole page.

type Member = GroupPublicView["members"][number];

export type View =
  | { kind: "loading" }
  | { kind: "badLink" }
  | { kind: "error"; message: string }
  | { kind: "names"; group: GroupPublicView }
  | { kind: "pin"; group: GroupPublicView; member: Member }
  | { kind: "home" };

/** The juz card's step in the «Оқыдым» flow (design §J). */
export type CardStep = "normal" | "undo" | "confirmRemove";

const UNDO_MS = 15_000;

let linkToken = "";
let undoTimer: ReturnType<typeof setTimeout> | undefined;

export const view = signal<View>({ kind: "loading" });
export const home = signal<Omit<MeView, "seats"> | null>(null);
export const seatIds = signal<number[]>([]);
const seats = new Map<number, Signal<SeatView>>();

export const cardStep = signal<CardStep>("normal");
export const confirmingLogout = signal(false);
export const busy = signal(false);
export const cardMessage = signal<{ text: string; isError: boolean } | null>(null);
export const refreshing = signal(false);
export const updatedAt = signal<Date | null>(null);
/** True while the server can't be reached; the home screen shows the saved data (decision 11). */
export const offline = signal(false);

export const seat = (id: number) => seats.get(id);

export const mySeat = computed(() => {
  const id = home.value?.me.seatId;
  return id === null || id === undefined ? undefined : seats.get(id)?.value;
});

export const deadline = computed(() => {
  const data = home.value;
  return data ? deadlineState(data.round.deadlineDate, data.today) : null;
});

export const groupProgress = computed(() =>
  progress(seatIds.value.map((id) => seats.get(id)?.value ?? { status: "unread" as const })),
);

/** Opens the app on a group link: home if logged in to this group, else the name list. */
export async function start(token: string): Promise<void> {
  linkToken = token;
  view.value = { kind: "loading" };
  const me = await api.get<MeView>("/api/me");
  if (me.ok && me.data.group.linkToken === token) {
    applyMe(me.data);
    view.value = { kind: "home" };
    return;
  }
  if (!me.ok && me.error.code === "offline") {
    const cached = readHome();
    if (cached?.data.group.linkToken === token) {
      applyMe(cached.data, new Date(cached.savedAt));
      offline.value = true;
      view.value = { kind: "home" };
    } else {
      view.value = { kind: "error", message: texts.offline };
    }
    return;
  }
  if (!me.ok && me.error.code === "no_session") clearHome();
  await showNames();
}

/** Opened without a link ("/"): go to the logged-in group, if any. */
export async function startWithoutLink(): Promise<string | null> {
  const me = await api.get<MeView>("/api/me");
  if (me.ok) return me.data.group.linkToken;
  const cached = me.error.code === "offline" ? readHome() : null;
  if (cached) return cached.data.group.linkToken; // start() then shows the saved data
  view.value =
    me.error.code === "offline" ? { kind: "error", message: texts.offline } : { kind: "badLink" };
  return null;
}

export async function showNames(): Promise<void> {
  const group = await api.get<GroupPublicView>(`/api/g/${linkToken}`);
  if (group.ok) view.value = { kind: "names", group: group.data };
  else if (group.status === 404) view.value = { kind: "badLink" };
  else view.value = { kind: "error", message: errorText(group) };
}

/** Opens the PIN screen. A history entry lets the phone's Back button return to the names. */
export function chooseMember(group: GroupPublicView, member: Member): void {
  history.pushState({ screen: "pin" }, "");
  view.value = { kind: "pin", group, member };
}

/** «Басқа есімді таңдау» or the phone's Back button. */
export function backToNames(): void {
  const current = view.value;
  if (current.kind === "pin") view.value = { kind: "names", group: current.group };
}

export type PinResult = { ok: true } | { ok: false; message: string; switchToEnter?: boolean };

export async function submitPin(member: Member, pin: string, pinConfirm?: string) {
  const body =
    pinConfirm === undefined
      ? { memberId: member.id, pin }
      : { memberId: member.id, pin, pinConfirm };
  const result = await api.post(`/api/g/${linkToken}/login`, body);
  if (result.ok) {
    if ((history.state as { screen?: string } | null)?.screen === "pin") {
      history.replaceState(null, ""); // Back from home should not reopen the PIN screen
    }
    await start(linkToken);
    return { ok: true } satisfies PinResult;
  }
  const { error } = result;
  const fail = (message: string, switchToEnter = false): PinResult => ({
    ok: false,
    message,
    switchToEnter,
  });
  if (error.code === "wrong_pin") return fail(texts.pinWrong(error.triesLeft ?? 0));
  if (error.code === "pin_mismatch") return fail(texts.pinMismatch);
  if (error.code === "invalid") return fail(texts.pinNeedFourDigits);
  if (error.code === "pin_already_set") return fail(texts.pinAlreadySet, true);
  return fail(errorText(result));
}

function applyMe(data: MeView, savedAt?: Date): void {
  if (savedAt === undefined) {
    saveHome(data);
    offline.value = false;
  }
  const { seats: list, ...rest } = data;
  batch(() => {
    for (const item of list) {
      const existing = seats.get(item.id);
      if (!existing) seats.set(item.id, signal(item));
      else if (JSON.stringify(existing.value) !== JSON.stringify(item)) existing.value = item;
    }
    home.value = rest;
    const ids = list.map((item) => item.id);
    if (ids.join() !== seatIds.value.join()) seatIds.value = ids;
    updatedAt.value = savedAt ?? new Date();
  });
}

/** Reloads the home data (P-5): «Жаңарту», pull down, or coming back to the app. */
export async function refresh(): Promise<void> {
  if (refreshing.value || view.value.kind !== "home") return;
  refreshing.value = true;
  const me = await api.get<MeView>("/api/me");
  refreshing.value = false;
  if (me.ok) applyMe(me.data);
  else if (me.error.code === "offline") offline.value = true;
  else if (me.error.code === "no_session") {
    clearHome();
    await showNames();
  }
}

async function setMyStatus(read: boolean, via?: "undo"): Promise<boolean> {
  const id = home.value?.me.seatId;
  if (id === null || id === undefined || busy.value) return false;
  busy.value = true;
  cardMessage.value = null;
  const result = await api.put<{ seat: SeatView }>(`/api/me/seats/${String(id)}/status`, {
    read,
    ...(via ? { via } : {}),
  });
  busy.value = false;
  if (result.ok) {
    const target = seats.get(id);
    if (target) target.value = result.data.seat;
    return true;
  }
  // The old state stays; the screen shows why (design §K: no optimistic UI).
  if (result.error.code === "offline") offline.value = true;
  if (result.error.code === "no_session") {
    clearHome();
    await showNames();
  } else cardMessage.value = { text: errorText(result), isError: true };
  return false;
}

function clearUndoTimer(): void {
  if (undoTimer !== undefined) clearTimeout(undoTimer);
  undoTimer = undefined;
}

/** «Оқыдым» → «Белгіленді» + «Қайтару» for 15 seconds (P-3). */
export async function markRead(): Promise<void> {
  if (!(await setMyStatus(true))) return;
  clearUndoTimer();
  cardStep.value = "undo";
  cardMessage.value = { text: texts.marked, isError: false };
  undoTimer = setTimeout(() => {
    if (cardStep.value === "undo") cardStep.value = "normal";
  }, UNDO_MS);
}

export async function undoMark(): Promise<void> {
  if (!(await setMyStatus(false, "undo"))) return;
  clearUndoTimer();
  cardStep.value = "normal";
  cardMessage.value = { text: texts.markRemoved, isError: false };
}

export function askRemoveMark(): void {
  cardMessage.value = null;
  cardStep.value = "confirmRemove";
}

export function cancelRemoveMark(): void {
  cardStep.value = "normal";
}

/** «Иә, алып тастау» (P-4). */
export async function removeMark(): Promise<void> {
  if (!(await setMyStatus(false))) return;
  cardStep.value = "normal";
  cardMessage.value = { text: texts.markRemoved, isError: false };
}

export const logoutError = signal<string | null>(null);

/** «Иә, шығу» (P-7): ends the session and shows the name list. */
export async function logout(): Promise<void> {
  busy.value = true;
  logoutError.value = null;
  const result = await api.post("/api/logout");
  busy.value = false;
  if (!result.ok) {
    logoutError.value = errorText(result); // stay logged in; the panel says why
    return;
  }
  clearUndoTimer();
  clearHome();
  batch(() => {
    confirmingLogout.value = false;
    cardStep.value = "normal";
    cardMessage.value = null;
    home.value = null;
  });
  await showNames();
}

// Back online: load fresh data. Offline: show the banner at once.
window.addEventListener("online", () => void refresh());
window.addEventListener("offline", () => {
  if (view.value.kind === "home") offline.value = true;
});
