// Secrets are not in wrangler.jsonc, so `wrangler types` can't see them. We declare them here.
// `npm run prepare` runs `wrangler types --env-file /dev/null`, so it ignores .dev.vars and local types
// match CI. In code and tests, use Cloudflare.Env (declared here), not the generated global Env.
// Values: .dev.vars (local), `wrangler secret put` (staging / production). Never in git.
declare namespace Cloudflare {
  interface Env {
    PEPPER: string;
    ORGANIZER_USERNAME: string;
    ORGANIZER_PASSWORD_HASH: string;
    // Every environment has a D1 database (production gets its own in T3.7).
    DB: D1Database;
  }
}
