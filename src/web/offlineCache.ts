import type { MeView } from "../shared/api.ts";

// The last home data, kept on this phone so the app can open without internet (decision 11).
// Read-only use; cleared on «Шығу» and when the session ends. Storage can be missing or full
// (private mode), so every call is allowed to fail quietly.

const KEY = "hatm.home";

export type CachedHome = { data: MeView; savedAt: string };

export function saveHome(data: MeView): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ data, savedAt: new Date().toISOString() }));
  } catch {
    // no storage: the app still works online
  }
}

export function readHome(): CachedHome | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw === null ? null : (JSON.parse(raw) as Partial<CachedHome>);
    return parsed?.data?.group && typeof parsed.savedAt === "string"
      ? { data: parsed.data, savedAt: parsed.savedAt }
      : null;
  } catch {
    return null;
  }
}

export function clearHome(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
