#!/usr/bin/env node
/**
 * 端到端对齐：萌兔 admin srcPost 改菜单 → bot-server callback 即时生效
 *
 * 前置：admin (8790) + bot-server (8788) 已启动
 * 本地跑请显式指定（避免 shell 残留云端 ADMIN_URL）：
 *   $env:ADMIN_URL="http://127.0.0.1:8790"; $env:BOT_SERVER_URL="http://127.0.0.1:8788"; pnpm e2e:menu-alignment
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN = process.env.ADMIN_URL ?? "http://127.0.0.1:8790";
const BOT = process.env.BOT_SERVER_URL ?? "http://127.0.0.1:8788";
const ROOM = process.env.E2E_ROOM ?? "57226609398@chatroom";
const OVERRIDE = path.join(ROOT, "data/agent-overrides/menu.json");

const E2E_MARKER = "【E2E菜单对齐】";
const E2E_MENU_LINE = "测试功能A";

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
      room_sender_by: `wxid_e2e_menu_${Date.now()}`,
      member_info: { nickName: "E2E菜单测试" },
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
  console.log(`  ADMIN=${ADMIN}`);
  console.log(`  BOT=${BOT}`);
  if (ADMIN.includes("127.0.0.1") !== BOT.includes("127.0.0.1")) {
    console.warn("WARN: ADMIN 与 BOT 不在同一环境，对齐测试可能误判");
  }

  const form = {
    switch_checked: 1,
    type: "[自定义菜单]",
    message: `${E2E_MARKER}${E2E_MENU_LINE}[换行]测试功能B`,
  };

  const save = await post(`${ADMIN}/api/Agent/srcPost`, { op: "menu", form });
  if (save.json.status !== 1) {
    console.error("srcPost FAIL:", save.json);
    failed = true;
  } else {
    console.log("1. admin srcPost menu: OK");
  }

  const got = await post(`${ADMIN}/api/Agent/srcGet`, { op: "menu" });
  const msgField = got.json.data?.form?.find((f) => f.name === "message");
  const msgStr = msgField?.value == null ? "" : String(msgField.value);
  if (!msgStr.includes(E2E_MARKER)) {
    console.error("2. srcGet message mismatch:", msgField?.value);
    failed = true;
  } else {
    console.log("2. admin srcGet message: OK");
  }

  const debugRes = await fetch(
    `${BOT}/super/debug/menu?roomId=${encodeURIComponent(ROOM)}`,
  );
  if (!debugRes.ok) {
    console.error("3. bot debug/menu HTTP", debugRes.status, await debugRes.text());
    failed = true;
  } else {
    const debug = await debugRes.json();
    if (!debug.data?.enabled || !debug.data?.menuTextPreview?.includes(E2E_MARKER)) {
      console.error("3. bot menu mismatch:", debug.data);
      failed = true;
    } else {
      console.log("3. bot resolveMenuText:", debug.data.menuTextPreview?.slice(0, 60));
    }
  }

  const cb = await post(`${BOT}/super/msg/callback`, msgPayload("菜单"));
  const content = cb.json.data?.[0]?.content ?? "";
  const ok = content.includes(E2E_MARKER) && content.includes(E2E_MENU_LINE);
  console.log("4. callback [菜单]:", ok ? "OK" : "FAIL", content.slice(0, 80));
  if (!ok) failed = true;

  const cbFn = await post(`${BOT}/super/msg/callback`, msgPayload("功能"));
  const fnOk = (cbFn.json.data?.[0]?.content ?? "").includes(E2E_MARKER);
  console.log("5. callback [功能]:", fnOk ? "OK" : "FAIL");
  if (!fnOk) failed = true;
} catch (e) {
  console.error("E2E error:", e.message ?? e);
  failed = true;
} finally {
  if (hadOverride && backup) {
    fs.writeFileSync(OVERRIDE, backup);
    console.log("restored previous menu.json override");
  } else if (!hadOverride && fs.existsSync(OVERRIDE)) {
    fs.unlinkSync(OVERRIDE);
    console.log("removed temporary menu.json override");
  }
}

if (failed) process.exit(1);
console.log("\nMenu alignment E2E OK");
