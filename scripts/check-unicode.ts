// Fails if any tracked text file contains invisible or bidirectional Unicode characters.
// They can hide code from a reviewer ("Trojan Source", CVE-2021-42574) or break text silently.
// If you really need such a character in a string, write it as an escape, e.g. "\u00A0".
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Invisible characters that Unicode classifies as letters or marks, so the categories miss them.
const INVISIBLE_LETTERS = new Set([0x034f, 0x115f, 0x1160, 0x2800, 0x3164, 0xffa0]);
const ALLOWED_CONTROLS = new Set([0x09, 0x0a, 0x0d]); // tab, newline, carriage return
const NORMAL_SPACE = 0x20;

/**
 * Cc = control characters, Cf = format characters (incl. bidi controls like right-to-left
 * override, zero-width space, byte-order mark), Zl/Zp = line/paragraph separators,
 * Zs = space characters (only the normal space is allowed).
 */
function isForbidden(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0;
  if (ALLOWED_CONTROLS.has(codePoint) || codePoint === NORMAL_SPACE) return false;
  return /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Zs}]/u.test(char) || INVISIBLE_LETTERS.has(codePoint);
}

const toHex = (codePoint: number) => `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const problems: string[] = [];
for (const file of files) {
  const bytes = readFileSync(file);
  if (bytes.includes(0)) continue; // binary file (e.g. an image)

  bytes
    .toString("utf8")
    .split("\n")
    .forEach((line, index) => {
      let column = 1;
      for (const char of line) {
        if (isForbidden(char)) {
          problems.push(
            `${file}:${String(index + 1)}:${String(column)}  ${toHex(char.codePointAt(0) ?? 0)}`,
          );
        }
        column += 1;
      }
    });
}

if (problems.length > 0) {
  console.error("Invisible or bidirectional Unicode characters found:");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error('Remove them, or write them as an escape (e.g. "\\u00A0") if they are needed.');
  process.exit(1);
}
console.log(`Unicode check: ${String(files.length)} files clean.`);
