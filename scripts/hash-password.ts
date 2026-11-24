// Makes ORGANIZER_PASSWORD_HASH for one environment (design §F, §G).
//
//   npm run hash-password
//
// It asks for that environment's PEPPER and the new password with hidden input, so neither
// shows on screen, in shell history or in command arguments. The hash only works with that
// environment's PEPPER (staging and production have different ones).
import { hashSecret } from "../src/worker/auth/hash.ts";

const MIN_PASSWORD = 6; // requirements §6.4
const MIN_PEPPER = 16;

const ENTER = [String.fromCharCode(13), String.fromCharCode(10)];
const CTRL_C = String.fromCharCode(3);
const BACKSPACE = [String.fromCharCode(127), String.fromCharCode(8)];

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

/** Reads one line from the terminal without showing what is typed. */
function askHidden(question: string): Promise<string> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) fail("run this in a terminal (it reads hidden input)");
  stdin.setRawMode(true); // echo off BEFORE the question, so nothing typed is ever shown
  stdout.write(question);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (ENTER.includes(char)) {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === CTRL_C) {
          stdin.setRawMode(false);
          stdout.write("\n");
          process.exit(130);
        }
        value = BACKSPACE.includes(char) ? value.slice(0, -1) : value + char;
      }
    };
    stdin.on("data", onData);
  });
}

console.log("Organizer password hash. Have this environment's PEPPER ready (password manager).\n");

const pepper = await askHidden("PEPPER of the environment (hidden): ");
if (pepper.length < MIN_PEPPER) fail("that doesn't look like a PEPPER (too short)");

const password = await askHidden(
  `New organizer password, at least ${String(MIN_PASSWORD)} characters (hidden): `,
);
if (password.length < MIN_PASSWORD)
  fail(`the password needs at least ${String(MIN_PASSWORD)} characters`);
if ((await askHidden("Repeat the password (hidden): ")) !== password)
  fail("the passwords don't match");

const hash = await hashSecret(password, pepper);

console.log(`
ORGANIZER_PASSWORD_HASH:

${hash}

Next (staging shown; use --env production for production):
  npx wrangler secret put ORGANIZER_USERNAME --env staging        # type the username
  npx wrangler secret put ORGANIZER_PASSWORD_HASH --env staging   # paste the hash above
For local development, put it in .dev.vars in single quotes: ORGANIZER_PASSWORD_HASH='${hash.slice(0, 14)}…'
Save the password in your password manager. Never paste it into a chat.`);
