import type { Context } from "hono";

export type AppEnv = { Bindings: Cloudflare.Env };
export type AppContext = Context<AppEnv>;
