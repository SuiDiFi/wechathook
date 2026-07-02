import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const bindingCandidates = [
  path.join(
    root,
    "node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3/build/Release/better_sqlite3.node",
  ),
  path.join(root, "node_modules/better-sqlite3/build/Release/better_sqlite3.node"),
];

const hasBinding = bindingCandidates.some((p) => fs.existsSync(p));
if (hasBinding) {
  process.exit(0);
}

console.log("[postinstall] Building better-sqlite3 native module...");

const pkgDirs = [ 
  path.join(root, "node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3"),
  path.join(root, "node_modules/better-sqlite3"),
];

for (const dir of pkgDirs) {
  if (!fs.existsSync(path.join(dir, "package.json"))) continue;
  const result = spawnSync("npm", ["run", "build-release"], {
    cwd: dir,
    stdio: "inherit",
    shell: true,
  });
  if (result.status === 0) {
    process.exit(0);
  }
}

console.warn("[postinstall] better-sqlite3 build skipped or failed; run manually if startup fails.");
process.exit(0);
