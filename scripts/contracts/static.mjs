#!/usr/bin/env node
/** 静态契约：路径、常量、关键文件与文档一致（无需服务） */
import {
  ROOT,
  assert,
  fileExists,
  readText,
  pass,
  section,
  fail,
} from "./_lib.mjs";

let errors = 0;

function check(cond, msg) {
  if (cond) pass(msg);
  else {
    fail(msg);
    errors++;
  }
}

section("override paths");

check(
  readText("packages/plugin-config/src/override-paths.ts").includes('AGENT_OVERRIDES_DIR = "data/agent-overrides"'),
  "AGENT_OVERRIDES_DIR constant",
);
check(
  readText("packages/plugin-config/src/override-paths.ts").includes('GROUP_OVERRIDES_DIR = "data/group-overrides"'),
  "GROUP_OVERRIDES_DIR constant",
);

section("archive baselines");

check(
  fileExists("reference/mtrobot-agent-portal/api-samples/full-sync/Agent/srcGet/sign.json"),
  "sign.json archive exists",
);
check(
  fileExists("reference/mtrobot-agent-portal/static/agent/index.html"),
  "mengtu agent index.html exists",
);

section("group config sample");

check(
  fileExists("config/groups/57226609398@chatroom.yaml"),
  "E2E test group yaml exists",
);

section("integration docs");

for (const f of [
  "docs/development/CURRENT.md",
  "docs/development/integration-workflow.md",
  "docs/development/contracts/README.md",
  "docs/development/contracts/admin-bot.md",
  "docs/development/contracts/super-api.md",
  "docs/development/contracts/config-priority.md",
]) {
  check(fileExists(f), f);
}

section("admin srcPost implementation");

const mengtuApi = readText("apps/admin/src/mengtu-api.ts");
check(mengtuApi.includes("parseSrcPostForm"), "admin parses srcPost form/data");
check(mengtuApi.includes("AGENT_OVERRIDES_DIR"), "admin uses shared override dir constant");

section("bot sign resolution");

const loader = readText("packages/plugin-config/src/loader.ts");
check(loader.includes("resolveSignConfig"), "PluginConfigLoader.resolveSignConfig");
check(loader.includes("loadGroupOverride"), "PluginConfigLoader.loadGroupOverride");

const signEngine = readText("packages/bot-core/src/super/sign-engine.ts");
check(signEngine.includes("resolveSignConfig"), "SignEngine uses plugin config");

section("cursor rules");

check(fileExists(".cursor/rules/wechathook-integration.mdc"), "integration cursor rule");

if (errors) {
  console.error(`\nStatic contracts: ${errors} failure(s)`);
  process.exit(1);
}
console.log("\nStatic contracts OK");
