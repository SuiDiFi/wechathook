#!/usr/bin/env node
/**
 * 从萌兔 MTRobot 日志抽取 inject rabbitr API（/r/*）样本
 * 用法: node scripts/extract-mt-inject-api.mjs [logPath]
 */
import fs from "node:fs";
import path from "node:path";

const logPath =
  process.argv[2] ??
  path.join(process.env.LOCALAPPDATA ?? "", "com.admin.MTRobot", "logs", "MTRobot-2026-06-26.log");

if (!fs.existsSync(logPath)) {
  console.error("Log not found:", logPath);
  process.exit(1);
}

const text = fs.readFileSync(logPath, "utf8");
const lines = text.split(/\r?\n/);

const endpoints = new Map();
const msgTypes = new Set();
const modes = new Set();

for (const line of lines) {
  const req = line.match(/请求: (\/r\/\w+)/);
  if (req) {
    const ep = req[1];
    const paramMatch = line.match(/参数: (\{.*\})/);
    endpoints.set(ep, {
      path: ep,
      sampleParams: paramMatch ? tryParse(paramMatch[1]) : null,
      count: (endpoints.get(ep)?.count ?? 0) + 1,
    });
  }

  const hmc = line.match(/\[handleMessagecallback\] (\{.*\})/);
  if (hmc) {
    const obj = tryParse(hmc[1]);
    if (obj?.msg_type != null) msgTypes.add(obj.msg_type);
  }

  if (line.includes('"kernel_mode":"inject"')) modes.add("inject");
  if (line.includes('"kernel_mode":"win"')) modes.add("win");
}

const outDir = path.resolve("reference/mtrobot-agent-portal/api-samples/inject-session-2026-06-26");
fs.mkdirSync(outDir, { recursive: true });

const manifest = {
  extractedAt: new Date().toISOString(),
  sourceLog: logPath,
  kernelModes: [...modes],
  rabbitrEndpoints: [...endpoints.values()],
  handleMessagecallbackMsgTypes: [...msgTypes].sort((a, b) => a - b),
  notes: {
    sendText: "POST /r/stm { t: roomId, c: content }",
    sqlQuery: "POST /r/sqe { db, sq }",
    httpPort: 19088,
    wechatVersion: "4.1.9.55",
  },
};

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Wrote", path.join(outDir, "manifest.json"));
console.log("Endpoints:", manifest.rabbitrEndpoints.map((e) => e.path).join(", "));
console.log("msg_types:", manifest.handleMessagecallbackMsgTypes.join(", "));

function tryParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
