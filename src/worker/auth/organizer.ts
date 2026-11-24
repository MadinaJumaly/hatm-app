import { MalformedHashError, verifySecret } from "./verify.ts";
import { sha256Hex } from "./tokens.ts";

// The one organizer account (requirements O-1, decision 15). Username and password hash come
// from secrets (ORGANIZER_USERNAME, ORGANIZER_PASSWORD_HASH), never from code or the database.

/** Rate-limit key for the organizer account: 5 failures → 15-minute lock (design §F). */
export const ORGANIZER_KEY = "org";
export const ORGANIZER_FAILURE_LIMIT = 5;

type Credentials = { username: string; password: string };
type OrganizerSecrets = {
  ORGANIZER_USERNAME: string;
  ORGANIZER_PASSWORD_HASH: string;
  PEPPER: string;
};

/**
 * True only for the right username AND password. The password is always hashed, even when the
 * username is wrong, so the answer time doesn't tell an attacker which part was wrong.
 */
export async function checkOrganizerLogin(
  input: Credentials,
  env: OrganizerSecrets,
): Promise<boolean> {
  if (!env.ORGANIZER_USERNAME || !env.ORGANIZER_PASSWORD_HASH) {
    console.error("organizer login is not configured");
    return false;
  }
  const [given, expected] = await Promise.all([
    sha256Hex(input.username),
    sha256Hex(env.ORGANIZER_USERNAME),
  ]);
  const encoder = new TextEncoder();
  const usernameOk = crypto.subtle.timingSafeEqual(encoder.encode(given), encoder.encode(expected));
  const passwordOk = await verifyPassword(input.password, env);
  return usernameOk && passwordOk;
}

/**
 * A malformed ORGANIZER_PASSWORD_HASH (e.g. only part of it was pasted) refuses the login like a
 * wrong password, with a log line that names the cause. Other errors (e.g. no PEPPER) still throw.
 */
async function verifyPassword(password: string, env: OrganizerSecrets): Promise<boolean> {
  try {
    return await verifySecret(password, env.ORGANIZER_PASSWORD_HASH, env.PEPPER);
  } catch (err) {
    if (!(err instanceof MalformedHashError)) throw err;
    console.error("ORGANIZER_PASSWORD_HASH is malformed");
    return false;
  }
}
