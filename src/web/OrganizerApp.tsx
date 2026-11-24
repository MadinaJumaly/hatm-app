import { useEffect } from "preact/hooks";
import type { Route } from "./routes.ts";
import { OrgCreate } from "./screens/org/OrgCreate.tsx";
import { OrgGroup } from "./screens/org/OrgGroup.tsx";
import { OrgGroups } from "./screens/org/OrgGroups.tsx";
import { OrgLogin } from "./screens/org/OrgLogin.tsx";
import { Message } from "./screens/Message.tsx";
import { loadGroups, session } from "./state/organizer.ts";
import { texts } from "./texts.kk.ts";

type OrgRoute = Extract<Route, { kind: "orgGroups" | "orgNew" | "orgGroup" }>;

/** The organizer pages (/org/…). Shows the login first when there is no session. */
export function OrganizerApp({ route }: { route: OrgRoute }) {
  useEffect(() => {
    if (session.value === "checking") void loadGroups();
  }, []);

  switch (session.value) {
    case "checking":
      return <Message title={texts.org.role} hint={texts.loading} />;
    case "loggedOut":
      return <OrgLogin onLoggedIn={() => void loadGroups()} />;
    case "loggedIn":
      if (route.kind === "orgNew") return <OrgCreate />;
      if (route.kind === "orgGroup") return <OrgGroup id={route.id} />;
      return <OrgGroups />;
  }
}
