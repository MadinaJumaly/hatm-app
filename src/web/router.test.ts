import { describe, expect, it } from "vitest";

import { parseRoute } from "./routes.ts";

describe("parseRoute", () => {
  it("reads the token of a group link", () => {
    expect(parseRoute("/g/AAAAAAAAAAAAAAAAAAAAAA")).toEqual({
      kind: "group",
      token: "AAAAAAAAAAAAAAAAAAAAAA",
    });
    expect(parseRoute("/g/abc/")).toEqual({ kind: "group", token: "abc" });
  });

  it("knows the root page", () => {
    expect(parseRoute("/")).toEqual({ kind: "root" });
  });

  it("knows the organizer pages", () => {
    expect(parseRoute("/org")).toEqual({ kind: "orgGroups" });
    expect(parseRoute("/org/")).toEqual({ kind: "orgGroups" });
    expect(parseRoute("/org/new")).toEqual({ kind: "orgNew" });
    expect(parseRoute("/org/groups/12")).toEqual({ kind: "orgGroup", id: 12 });
  });

  it.each([
    "/g/",
    "/g/a/b",
    "/g/<script>",
    "/something",
    "/org/groups/0",
    "/org/groups/x",
    "/org/x",
  ])("treats %s as unknown", (path) => {
    expect(parseRoute(path)).toEqual({ kind: "unknown" });
  });
});
