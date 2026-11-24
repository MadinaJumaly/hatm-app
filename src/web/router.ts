import { signal } from "@preact/signals";
import { parseRoute, type Route } from "./routes.ts";

// A tiny router (design §K):
//   /g/<token>        participant          /org               organizer: groups (or login)
//   /                 my group, if any     /org/new           organizer: create a khatm
//   anything else     «Сілтеме қате»       /org/groups/<id>   organizer: one group

export { parseRoute, type Route };

export const route = signal<Route>(parseRoute(location.pathname));

/** Changes the page without reloading (organizer links). */
export function navigate(path: string): void {
  history.pushState(null, "", path);
  route.value = parseRoute(path);
  window.scrollTo(0, 0);
}

// Browser Back / Forward between organizer pages. Same path (e.g. the participant PIN screen's
// history entry) keeps the same route, so the participant app isn't restarted.
window.addEventListener("popstate", () => {
  const next = parseRoute(location.pathname);
  if (JSON.stringify(next) !== JSON.stringify(route.value)) route.value = next;
});
