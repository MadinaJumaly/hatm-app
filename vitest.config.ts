import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { hashSecret } from "./src/worker/auth/hash.ts";

// Test-only values. Real secrets live in Cloudflare and .dev.vars, never in git.
const TEST_PEPPER = "test-pepper-not-a-secret";
const TEST_ORGANIZER = { username: "test-organizer", password: "test-password-123" };

// Tests run inside the real Workers runtime (workerd) with a real local D1.
export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            PEPPER: TEST_PEPPER,
            ORGANIZER_USERNAME: TEST_ORGANIZER.username,
            // Fewer iterations keep tests fast; the login code is the same.
            ORGANIZER_PASSWORD_HASH: await hashSecret(TEST_ORGANIZER.password, TEST_PEPPER, 1_000),
          },
        },
      }),
    ],
    test: {
      include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
      setupFiles: ["./tests/apply-migrations.ts"],
    },
  };
});
