import { Hono } from "hono";
import type { AppEnv } from "./app-env.ts";
import { securityHeaders, writeGuard } from "./middleware/security.ts";
import { groupApi, groupManifest } from "./routes/group.ts";
import { meApi } from "./routes/me.ts";
import { orgApi } from "./routes/org.ts";

const app = new Hono<AppEnv>();

app.use(securityHeaders);
app.use("/api/*", writeGuard);

app.route("/api/g", groupApi);
app.route("/api", meApi);
app.route("/api/org", orgApi);
app.route("/g", groupManifest);

// Unknown API paths: a JSON 404 in our error format (design §D).
app.notFound((c) => c.json({ code: "not_found" }, 404));

// Never send error details to the client. Log only the error, never the request (no tokens or links in logs).
app.onError((err, c) => {
  console.error("unhandled error", err instanceof Error ? err.name : "unknown");
  return c.json({ code: "server_error" }, 500);
});

export default app;
