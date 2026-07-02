#!/usr/bin/env node
/** 从萌兔归档提取 admin UI seed（完整菜单等） */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const samples = path.join(ROOT, "reference/mtrobot-agent-portal/api-samples/read-only-samples.json");
const outDir = path.join(ROOT, "data/admin-seed");

const raw = JSON.parse(fs.readFileSync(samples, "utf8"));
const preview = raw["POST /Agent/menus"]?.dataPreview;
if (!preview) {
  console.error("Agent/menus missing in read-only-samples.json");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const data = JSON.parse(preview);
fs.writeFileSync(path.join(outDir, "agent-menus-full.json"), JSON.stringify(data, null, 2));
console.log("agent-menus-full.json sections:", data.menu?.length ?? 0);
