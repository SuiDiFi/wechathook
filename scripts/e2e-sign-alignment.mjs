#!/usr/bin/env node
/**
 * 端到端对齐示例：萌兔 admin srcPost 改签到 → bot-server callback 即时生效
 *
 * 前置：admin (8790) + bot-server (8788) 已启动
 *   pnpm start:admin
 *   pnpm start:server
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN = process.env.ADMIN_URL ?? "http://127.0.0.1:8790";
const BOT = process.env.BOT_SERVER_URL ?? "http://127.0.0.1:8788";
const ROOM = process.env.E2E_ROOM ?? "57226609398@chatroom";
const OVERRIDE = path.join(ROOT, "data/agent-overrides/sign.json");

const E2E_KEYWORD = "打卡对齐e2e";
const E2E_MARKER = "【E2E对齐示例】";

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

function msgPayload(text) {
  return {
    msg: {
      event_type: 2000,
      msgType: 1,
      acc_wxid: "along523618",
      account_wxid: "along523618",
      fromUserName: { String: ROOM },
      real_content: text,
      room_sender_by: `wxid_e2e_${Date.now()}`,
      member_info: { nickName: "E2E测试" },
    },
  };
}

const hadOverride = fs.existsSync(OVERRIDE);
const backup = hadOverride ? fs.readFileSync(OVERRIDE, "utf8") : null;

let failed = false;

try {
  const healthAdmin = await fetch(`${ADMIN}/agent/`).then((r) => r.status);
  const healthBot = await fetch(`${BOT}/health`).then((r) => r.json());
  if (healthAdmin >= 400) throw new Error(`admin 不可达: ${ADMIN}`);
  if (!healthBot.ok) throw new Error(`bot-server 不可达: ${BOT}`);
  console.log("services: admin + bot-server OK");

  const form = {
    switch_checked: 1,
    sign_content: E2E_KEYWORD,
    message: `@[昵称] ${E2E_MARKER}[换行]连续[连续]天`,
    min_jb: "100",
    max_jb: "9990",
    min_jf: "0",
    max_jf: "0",
  };

  const save = await post(`${ADMIN}/api/Agent/srcPost`, { op: "sign", form });
  if (save.json.status !== 1) {
    console.error("srcPost FAIL:", save.json);
    failed = true;
  } else {
    console.log("1. admin srcPost sign: OK");
  }

  const got = await post(`${ADMIN}/api/Agent/srcGet`, { op: "sign" });
  const signField = got.json.data?.form?.find((f) => f.name === "sign_content");
  if (signField?.value !== E2E_KEYWORD) {
    console.error("2. srcGet keyword mismatch:", signField?.value);
    failed = true;
  } else {
    console.log("2. admin srcGet keyword:", signField.value);
  }

  const debug = await fetch(
    `${BOT}/super/debug/sign?roomId=${encodeURIComponent(ROOM)}`,
  ).then((r) => r.json());
  if (debug.data?.keyword !== E2E_KEYWORD) {
    console.error("3. bot keyword mismatch:", debug.data?.keyword);
    failed = true;
  } else {
    console.log("3. bot resolveSignConfig:", debug.data.keyword, "(agentOverride:", debug.data.agentOverride, ")");
  }

  const cb = await post(`${BOT}/super/msg/callback`, msgPayload(E2E_KEYWORD));
  const content = cb.json.data?.[0]?.content ?? "";
  const ok = content.includes(E2E_MARKER);
  console.log("4. callback [", E2E_KEYWORD, "]:", ok ? "OK" : "FAIL", content.slice(0, 80));
  if (!ok) failed = true;

  const old = await post(`${BOT}/super/msg/callback`, msgPayload("签到"));
  const mengtuHit = (old.json.data ?? []).some((d) => d.content?.includes(E2E_MARKER));
  if (mengtuHit) {
    console.error("5. 旧关键词仍触发萌兔签到模板 — 对齐失败");
    failed = true;
  } else {
    console.log("5. 旧关键词「签到」未触发萌兔模板: OK");
  }
} catch (e) {
  console.error("E2E error:", e.message ?? e);
  failed = true;
} finally {
  if (hadOverride && backup) {
    fs.writeFileSync(OVERRIDE, backup);
    console.log("restored previous sign.json override");
  } else if (!hadOverride && fs.existsSync(OVERRIDE)) {
    fs.unlinkSync(OVERRIDE);
    console.log("removed temporary sign.json override");
  }
}

if (failed) process.exit(1);
console.log("\nSign alignment E2E OK");
