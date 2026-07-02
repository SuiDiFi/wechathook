#!/usr/bin/env node
/** 契约测试入口：静态 + 运行时 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function run(name) {
  console.log(`\n######## ${name} ########`);
  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/contracts", name)], {
    cwd: ROOT,
    stdio: "inherit",
  });
  return r.status ?? 1;
}

let code = run("static.mjs");
if (code !== 0) process.exit(code);
code = run("runtime.mjs");
process.exit(code);
