import { useEffect, useState } from "preact/hooks";
import { isInstalledApp } from "./install.ts";

const PULL_PX = 70;

/**
 * Pull down at the top of the page to refresh (P-5). Only in the installed app: in a normal
 * browser tab, the browser's own pull-to-refresh already reloads the page.
 * Returns true while the user is pulling far enough to refresh.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>): boolean {
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    if (!isInstalledApp()) return;
    let startY: number | null = null;
    let ready = false;

    const onStart = (event: TouchEvent) => {
      startY = window.scrollY <= 0 ? (event.touches[0]?.clientY ?? null) : null;
    };
    const onMove = (event: TouchEvent) => {
      if (startY === null) return;
      ready = (event.touches[0]?.clientY ?? startY) - startY > PULL_PX;
      setPulling(ready);
    };
    const onEnd = () => {
      if (ready) void onRefresh();
      startY = null;
      ready = false;
      setPulling(false);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onRefresh]);

  return pulling;
}
