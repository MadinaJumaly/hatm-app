// Fails if the browser JavaScript is bigger than the budget (requirements §5: JS ≤ 150 KB gzipped).
// Run after `npm run build`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_BYTES = 150 * 1024;
const assetsDir = "dist/client/assets";

const jsFiles = readdirSync(assetsDir).filter((name) => name.endsWith(".js"));
const totalGzip = jsFiles.reduce(
  (sum, name) => sum + gzipSync(readFileSync(join(assetsDir, name))).length,
  0,
);

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
console.log(`JS gzipped: ${kb(totalGzip)} (budget ${kb(BUDGET_BYTES)})`);

if (totalGzip > BUDGET_BYTES) {
  console.error("Bundle is over budget.");
  process.exit(1);
}
