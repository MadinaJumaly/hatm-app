import { checkIterations, derive, fromBase64, HASH_BYTES, PREFIX, SALT_BYTES } from "./hash.ts";

// Checking a PIN or password against a stored hash (design §G). Workers only: it uses
// crypto.subtle.timingSafeEqual, which Node doesn't have.

type ParsedHash = { iterations: number; salt: Uint8Array; hash: Uint8Array };

/** The stored hash isn't in our format: a server bug or a bad env value, not a wrong PIN. */
export class MalformedHashError extends Error {
  constructor() {
    super("Stored hash is malformed");
    this.name = "MalformedHashError";
  }
}

/** Throws MalformedHashError on a malformed stored hash. */
function parseStored(stored: string): ParsedHash {
  const parts = stored.startsWith(PREFIX) ? stored.slice(PREFIX.length).split("$") : [];
  const [iterationsText = "", saltText = "", hashText = ""] = parts;
  const iterations = /^\d{1,6}$/.test(iterationsText) ? Number(iterationsText) : NaN;
  try {
    checkIterations(iterations);
    const salt = fromBase64(saltText);
    const hash = fromBase64(hashText);
    if (parts.length !== 3 || salt.length !== SALT_BYTES || hash.length !== HASH_BYTES) {
      throw new Error("bad lengths");
    }
    return { iterations, salt, hash };
  } catch {
    throw new MalformedHashError();
  }
}

/** Checks a PIN or password against a stored hash in constant time. */
export async function verifySecret(
  secret: string,
  stored: string,
  pepper: string,
): Promise<boolean> {
  const { iterations, salt, hash } = parseStored(stored);
  const candidate = await derive(secret, pepper, salt, iterations);
  // Both are always HASH_BYTES long (checked above), as timingSafeEqual requires.
  return crypto.subtle.timingSafeEqual(candidate, hash);
}
