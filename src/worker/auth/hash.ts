// PIN and password hashing (design §G). WebCrypto only, so it fits the Workers free plan.
//
//   key    = HMAC-SHA256(PEPPER, secret)        the pepper is a Cloudflare secret, never in the DB
//   salt   = 16 random bytes, new for every hash
//   hash   = PBKDF2-SHA256(key, salt, iterations, 256 bits)
//   stored = "pbkdf2$sha256$<iterations>$<salt base64>$<hash base64>"
//
// The iteration count is stored in each hash, so we can raise it later and old hashes still verify.
//
// This file runs in Workers AND Node (scripts/hash-password.ts, vitest.config.ts). Checking a
// hash needs a Workers-only API, so it lives in verify.ts.

/**
 * Measured on staging in T0.5 (design §G): p99 4 ms CPU per hash, within the 5 ms login budget.
 * 20,000 reached 9 ms at p99, too close to the 10 ms free-plan limit.
 */
export const PBKDF2_ITERATIONS = 10_000;

/** Workers refuses PBKDF2 with more than 100,000 iterations. */
const MAX_ITERATIONS = 100_000;
export const SALT_BYTES = 16;
export const HASH_BYTES = 32;
const MIN_PEPPER_LENGTH = 16;
export const PREFIX = "pbkdf2$sha256$";

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

export function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

export async function derive(
  secret: string,
  pepper: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  if (pepper.length < MIN_PEPPER_LENGTH) throw new Error("PEPPER is missing or too short");

  const pepperKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const peppered = await crypto.subtle.sign("HMAC", pepperKey, encoder.encode(secret));
  const pbkdf2Key = await crypto.subtle.importKey("raw", peppered, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    pbkdf2Key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export function checkIterations(iterations: number): void {
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) {
    throw new RangeError(`iterations must be 1–${String(MAX_ITERATIONS)}`);
  }
}

/** Hashes a PIN or password for storage. */
export async function hashSecret(
  secret: string,
  pepper: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  checkIterations(iterations);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(secret, pepper, salt, iterations);
  return `${PREFIX}${String(iterations)}$${toBase64(salt)}$${toBase64(hash)}`;
}
