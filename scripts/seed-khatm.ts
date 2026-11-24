// Creates a khatm from a names file (one name per line), on local, staging or production.
// The fallback for creating khatms before the organizer screen exists (plan T1.1, cut list 4).
//
//   npm run seed -- --env local --title "Жұма хатмы — 1-топ" --duration 7 --names names.txt
//   options: --env local|staging|production  --start YYYY-MM-DD (default: today in Kazakhstan)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { addDays, todayInKz } from "../src/shared/dates.ts";
import { randomToken } from "../src/shared/random.ts";
import { validateDuration, validateNames, validateTitle } from "../src/shared/validation.ts";
import { buildKhatmSql } from "./khatm-sql.ts";

const BASE_URLS = {
  local: "http://localhost:5173",
  staging: "https://hatm-staging.hatm.workers.dev",
  production: "https://app.hatm.workers.dev",
} as const;
type Env = keyof typeof BASE_URLS;

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    env: { type: "string" },
    title: { type: "string" },
    duration: { type: "string" },
    names: { type: "string" },
    start: { type: "string" },
  },
});

const env = values.env as Env | undefined;
if (env === undefined || !(env in BASE_URLS)) fail("--env must be local, staging or production");

const title = validateTitle(values.title);
if (!title.ok) fail(`--title: ${title.error}`);

const duration = validateDuration(Number(values.duration));
if (!duration.ok) fail("--duration must be 7, 15, 20 or 30");

if (values.names === undefined) fail("--names <file> is required");
const names = validateNames(readFileSync(values.names, "utf8").split(/\r?\n/));
if (!names.ok) fail(`--names: ${JSON.stringify(names.error)}`);

const startDate = values.start ?? todayInKz(new Date());
if (addDays(startDate, 0) !== startDate) fail("--start must be a real date YYYY-MM-DD");

const linkToken = randomToken(16);
const sql = buildKhatmSql({
  title: title.value,
  durationDays: duration.value,
  names: names.value,
  startDate,
  linkToken,
  now: new Date().toISOString(),
});

const dir = mkdtempSync(join(tmpdir(), "hatm-seed-"));
const file = join(dir, "khatm.sql");
try {
  writeFileSync(file, sql);
  const target = env === "local" ? ["--local"] : ["--remote", "--env", env];
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", ...target, "--file", file, "--yes", "-c", "wrangler.jsonc"],
    { stdio: "inherit" },
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\nCreated "${title.value}" with ${String(names.value.length)} names.`);
console.log(`Group link (send it only to the group): ${BASE_URLS[env]}/g/${linkToken}`);
