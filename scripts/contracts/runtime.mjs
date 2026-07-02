#!/usr/bin/env node
/** 运行时契约：依赖在线服务，离线则 SKIP */
import {
  runNodeScript,
  serviceUp,
  fetchJson,
  section,
  pass,
  skip,
  fail,
} from "./_lib.mjs";

const BOT = process.env.BOT_SERVER_URL ?? "http://127.0.0.1:8788";
const ADMIN = process.env.ADMIN_URL ?? "http://127.0.0.1:8790";
const ROOM = process.env.E2E_ROOM ?? "57226609398@chatroom";

let failed = 0;
let skipped = 0;

async function maybeRun(name, url, script) {
  section(name);
  if (!(await serviceUp(url))) {
    skip(`${name}: service offline (${url})`);
    skipped++;
    return;
  }
  const r = runNodeScript(script);
  if (r.code === 0) {
    pass(name);
    if (r.stdout.trim()) console.log(r.stdout.trim().split("\n").slice(-3).join("\n"));
  } else {
    fail(name);
    if (r.stdout) console.error(r.stdout);
    if (r.stderr) console.error(r.stderr);
    failed++;
  }
}

section("health shape");

if (await serviceUp(`${BOT}/health`)) {
  const { json } = await fetchJson(`${BOT}/health`);
  if (json.ok && json.service === "wechathook-bot-server") pass("bot-server health shape");
  else {
    fail("bot-server health shape");
    failed++;
  }
} else {
  skip("bot-server health (offline)");
  skipped++;
}

if (await serviceUp(`${ADMIN}/health`)) {
  const { json } = await fetchJson(`${ADMIN}/health`);
  if (json.ok && json.service === "wechathook-admin") pass("admin health shape");
  else {
    fail("admin health shape");
    failed++;
  }
} else {
  skip("admin health (offline)");
  skipped++;
}

section("debug sign endpoint");

if (await serviceUp(`${BOT}/health`)) {
  const { json } = await fetchJson(`${BOT}/super/debug/sign?roomId=${encodeURIComponent(ROOM)}`);
  if (json.status === 1 && json.data && "keyword" in json.data) pass("GET /super/debug/sign shape");
  else {
    fail("GET /super/debug/sign shape");
    failed++;
  }
} else {
  skip("debug sign (bot offline)");
  skipped++;
}

await maybeRun("e2e:mvp", `${BOT}/health`, "scripts/e2e-mvp-sign.mjs");
await maybeRun("e2e:sign-alignment", `${ADMIN}/health`, "scripts/e2e-sign-alignment.mjs");
await maybeRun("e2e:cloud", `${ADMIN}/health`, "scripts/e2e-cloud-local.mjs");

console.log(`\nRuntime contracts: failed=${failed}, skipped=${skipped}`);
if (failed) process.exit(1);
console.log("Runtime contracts OK");
