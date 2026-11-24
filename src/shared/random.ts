// Random tokens from the platform's secure random generator (Workers and Node both have it).

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/** A random token of `byteCount` bytes as base64url (group links: 16 bytes = 128 bits). */
export function randomToken(byteCount: number): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(byteCount)));
}
