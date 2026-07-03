/**
 * 从 full-sync 提取插件目录 + 配置字段统计
 */
const fs = require("node:fs");
const path = require("node:path");

const SYNC = path.join(__dirname, "..", "reference", "mtrobot-agent-portal", "api-samples", "full-sync");
const OUT = path.join(__dirname, "..", "reference", "mtrobot-agent-portal");

const asetting = JSON.parse(
  fs.readFileSync(path.join(SYNC, "Agent/srcGet/asetting.json"), "utf8"),
);
const plugField = asetting.data.form.find((f) => f.name === "plug");
const plugins = (plugField?.select ? Object.entries(plugField.select) : []).map(([id, label]) => ({
  id,
  label,
}));

const srcDir = path.join(SYNC, "Agent/srcGet");
const configs = [];
for (const file of fs.readdirSync(srcDir)) {
  if (!file.endsWith(".json")) continue;
  const op = file.replace(".json", "");
  const j = JSON.parse(fs.readFileSync(path.join(srcDir, file), "utf8"));
  if (j.status !== 1) continue;
  const form = j.data?.form || [];
  configs.push({
    op,
    title: j.data?.title,
    fieldCount: form.length,
    hasSwitch: form.some((f) => f.name === "switch_checked"),
    fieldNames: form.map((f) => f.name).filter(Boolean),
  });
}

fs.writeFileSync(
  path.join(OUT, "plugin-catalog.json"),
  JSON.stringify({ plugins, count: plugins.length, configs }, null, 2),
);
console.log("plugins:", plugins.length, "configs:", configs.length);
