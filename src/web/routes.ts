// Pure route parsing (no browser needed, so it is unit-tested). See router.ts.

export type Route =
  | { kind: "group"; token: string }
  | { kind: "root" }
  | { kind: "orgGroups" }
  | { kind: "orgNew" }
  | { kind: "orgGroup"; id: number }
  | { kind: "unknown" };

export function parseRoute(pathname: string): Route {
  const group = /^\/g\/([A-Za-z0-9_-]{1,64})\/?$/.exec(pathname);
  if (group?.[1]) return { kind: "group", token: group[1] };
  if (pathname === "/") return { kind: "root" };
  if (/^\/org\/?$/.test(pathname)) return { kind: "orgGroups" };
  if (/^\/org\/new\/?$/.test(pathname)) return { kind: "orgNew" };
  const orgGroup = /^\/org\/groups\/([1-9]\d{0,9})\/?$/.exec(pathname);
  if (orgGroup?.[1]) return { kind: "orgGroup", id: Number(orgGroup[1]) };
  return { kind: "unknown" };
}
