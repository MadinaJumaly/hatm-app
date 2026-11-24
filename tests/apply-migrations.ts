import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Runs before every test file. Each test file gets a fresh local D1 with our schema.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
