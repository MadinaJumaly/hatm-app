import { useEffect } from "preact/hooks";
import { texts } from "./texts.kk.ts";

/** Each screen has its own page title (accessibility checklist). */
export function usePageTitle(screen: string | null): void {
  useEffect(() => {
    document.title = screen ? `${screen} — ${texts.appName}` : texts.appName;
  }, [screen]);
}
