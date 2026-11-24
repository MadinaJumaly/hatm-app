import { describe, expect, it } from "vitest";
import { hashSecret, PBKDF2_ITERATIONS } from "./hash.ts";
import { verifySecret } from "./verify.ts";

const PEPPER = "test-pepper-0123456789";
const FAST = 1_000; // fewer iterations keep the tests fast; the logic is the same

describe("hashSecret", () => {
  it("stores the algorithm, iteration count, salt and hash", async () => {
    const stored = await hashSecret("1234", PEPPER);
    expect(stored).toMatch(
      new RegExp(
        `^pbkdf2\\$sha256\\$${String(PBKDF2_ITERATIONS)}\\$[A-Za-z0-9+/=]{24}\\$[A-Za-z0-9+/=]{44}$`,
      ),
    );
  });

  it("never contains the PIN itself", async () => {
    expect(await hashSecret("1234", PEPPER, FAST)).not.toContain("1234");
  });

  it("uses a new random salt every time, so the same PIN gives different hashes", async () => {
    const first = await hashSecret("0000", PEPPER, FAST);
    const second = await hashSecret("0000", PEPPER, FAST);
    expect(first).not.toBe(second);
  });

  it("refuses a missing or short pepper", async () => {
    await expect(hashSecret("1234", "")).rejects.toThrow(/PEPPER/);
    await expect(hashSecret("1234", "short")).rejects.toThrow(/PEPPER/);
  });

  it.each([0, 100_001, 1.5])("refuses %d iterations", async (iterations) => {
    await expect(hashSecret("1234", PEPPER, iterations)).rejects.toThrow(RangeError);
  });
});

describe("verifySecret", () => {
  it("accepts the right PIN", async () => {
    const stored = await hashSecret("1234", PEPPER, FAST);
    expect(await verifySecret("1234", stored, PEPPER)).toBe(true);
  });

  it("refuses a wrong PIN", async () => {
    const stored = await hashSecret("1234", PEPPER, FAST);
    expect(await verifySecret("1235", stored, PEPPER)).toBe(false);
  });

  it("refuses the right PIN with a different pepper (a DB leak alone is not enough)", async () => {
    const stored = await hashSecret("1234", PEPPER, FAST);
    expect(await verifySecret("1234", stored, "another-pepper-0123456789")).toBe(false);
  });

  it("works for a password with non-ASCII characters", async () => {
    const stored = await hashSecret("Құпия сөз 2026!", PEPPER, FAST);
    expect(await verifySecret("Құпия сөз 2026!", stored, PEPPER)).toBe(true);
    expect(await verifySecret("құпия сөз 2026!", stored, PEPPER)).toBe(false);
  });

  it("still verifies hashes made with an older iteration count", async () => {
    const stored = await hashSecret("1234", PEPPER, 500);
    expect(await verifySecret("1234", stored, PEPPER)).toBe(true);
  });

  it("refuses a hash that was tampered with", async () => {
    const stored = await hashSecret("1234", PEPPER, FAST);
    // Change the first character of the hash part. (Not the last one: its low bits are padding.)
    const hashStart = stored.lastIndexOf("$") + 1;
    const newChar = stored[hashStart] === "A" ? "B" : "A";
    const tampered = `${stored.slice(0, hashStart)}${newChar}${stored.slice(hashStart + 1)}`;
    expect(tampered).not.toBe(stored);
    expect(await verifySecret("1234", tampered, PEPPER)).toBe(false);
  });

  it.each([
    "",
    "1234",
    "bcrypt$xyz",
    "pbkdf2$sha256$abc$AAAA$AAAA",
    "pbkdf2$sha256$1000$AAAA$AAAA",
    "pbkdf2$sha256$999999$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    "pbkdf2$sha256$1000$!!!$???",
  ])("throws for a malformed stored hash %j", async (stored) => {
    await expect(verifySecret("1234", stored, PEPPER)).rejects.toThrow(/malformed/);
  });
});
