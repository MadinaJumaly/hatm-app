import { useEffect } from "preact/hooks";
import { Home } from "./screens/Home.tsx";
import { Message } from "./screens/Message.tsx";
import { NameList } from "./screens/NameList.tsx";
import { PinForm } from "./screens/PinForm.tsx";
import type { Route } from "./routes.ts";
import { backToNames, start, startWithoutLink, view } from "./state/participant.ts";
import { texts } from "./texts.kk.ts";

/** The participant pages: /g/<token> and /. */
export function ParticipantApp({ route }: { route: Extract<Route, { kind: "group" | "root" }> }) {
  useEffect(() => {
    if (route.kind === "group") void start(route.token);
    if (route.kind === "root") {
      void startWithoutLink().then((token) => {
        if (token === null) return;
        history.replaceState(null, "", `/g/${token}`);
        void start(token);
      });
    }
  }, [route]);

  useEffect(() => {
    window.addEventListener("popstate", backToNames);
    return () => {
      window.removeEventListener("popstate", backToNames);
    };
  }, []);

  const current = view.value;
  switch (current.kind) {
    case "loading":
      return <Message title={texts.appName} hint={texts.loading} />;
    case "badLink":
      return <Message title={texts.badLinkTitle} hint={texts.badLinkHint} />;
    case "error":
      return (
        <Message
          title={texts.appName}
          hint={current.message}
          onRetry={() => route.kind === "group" && void start(route.token)}
        />
      );
    case "names":
      return <NameList group={current.group} />;
    case "pin":
      return <PinForm group={current.group} member={current.member} />;
    case "home":
      return <Home />;
  }
}
