import { signal } from "@preact/signals";

// Installing the site to the home screen (P-6).

/** Chrome's install prompt event (not in TypeScript's DOM types yet). */
type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/** Set when Android Chrome offers installing: then we show our own «Қолданбаны орнату» button. */
export const installPrompt = signal<InstallPromptEvent | null>(null);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault(); // we show our own button instead of Chrome's small bar
  installPrompt.value = event as InstallPromptEvent;
});
window.addEventListener("appinstalled", () => {
  installPrompt.value = null;
});

/** True when the site runs as an installed app. */
export function isInstalledApp(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

export type Platform = "iphone" | "android" | "other";

export function platform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac with touch.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return "iphone";
  }
  return /Android/.test(ua) ? "android" : "other";
}
