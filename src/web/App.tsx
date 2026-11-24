import { OrganizerApp } from "./OrganizerApp.tsx";
import { ParticipantApp } from "./ParticipantApp.tsx";
import { route } from "./router.ts";
import { Message } from "./screens/Message.tsx";
import { texts } from "./texts.kk.ts";
import { usePageTitle } from "./usePageTitle.ts";

export function App() {
  const current = route.value;
  switch (current.kind) {
    case "group":
    case "root":
      return <ParticipantApp route={current} />;
    case "orgGroups":
    case "orgNew":
    case "orgGroup":
      return <OrganizerApp route={current} />;
    case "unknown":
      return <BadLink />;
  }
}

function BadLink() {
  usePageTitle(texts.badLinkTitle);
  return <Message title={texts.badLinkTitle} hint={texts.badLinkHint} />;
}
