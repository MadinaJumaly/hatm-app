import { render } from "preact";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App.tsx";
import { route } from "./router.ts";
import "./styles.css";

// The installed app should open this group (design §H): point the manifest at the group.
const start = route.value;
if (start.kind === "group") {
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = `/g/${start.token}/manifest.webmanifest`;
  document.head.append(link);
}

// Offline app shell (design §H). A new version is used automatically after a deploy.
void registerSW({ immediate: true });

const root = document.getElementById("app");
if (root) render(<App />, root);
