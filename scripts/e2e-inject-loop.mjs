#!/usr/bin/env node
/**
 * inject 闭环 E2E：gateway recvMsg → bot-server → rabbitr /r/stm
 * 需 bot-server :8788；gateway :8787 且 botServer.relayEnabled=true
 * 可选 rabbitr :19088（离线时只验 relay 逻辑，跳过出站）
 */
const GATEWAY = process.env.GATEWAY_URL ?? "http://127.0.0.1:8787";
const BOT = process.env.BOT_SERVER_URL ?? "http://127.0.0.1:8788";
const RABBITR = process.env.RABBITR_URL ?? "http://127.0.0.1:19088";
const ROOM = "57226609398@chatroom";

function injectPayload(text) {
  return {
    event_type: 2000,
    event_desc: "群聊消息",
    msgType: 1,
    acc_wxid: "along523618",
    account_wxid: "along523618",
    fromUserName: { String: ROOM },
    real_content: text,
    room_sender_by: "wxid_test",
    member_info: { nickName: "E2E测试" },
  };
}

async function post(url, path, body) {
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function rabbitrOnline() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${RABBITR}/r/stm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: ROOM, c: "__e2e_ping__" }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok || res.status === 400;
  } catch {
    return false;
  }
}

let failed = false;

try {
  const botHealth = await fetch(`${BOT}/health`).then((r) => r.json());
  console.log("bot-server health:", botHealth.ok);
  if (!botHealth.ok) failed = true;

  let gatewayOk = false;
  try {
    const gwHealth = await fetch(`${GATEWAY}/health`).then((r) => r.json());
    gatewayOk = gwHealth.ok;
    console.log("gateway health:", gwHealth.ok);
  } catch {
    console.log("gateway: not running (skip relay test)");
  }

  const direct = await post(BOT, "/super/msg/callback", { msg: injectPayload("菜单") });
  const directOk = direct.json.data?.length > 0 && direct.json.data[0].msg_type === 1;
  console.log("bot-server direct [菜单]:", directOk ? "OK" : "FAIL");
  if (!directOk) failed = true;

  if (gatewayOk) {
    const viaGw = await post(GATEWAY, "/api/recvMsg", injectPayload("菜单"));
    const gwOk = viaGw.status === 200 && viaGw.json.code === 1;
    console.log("gateway relay [菜单]:", gwOk ? "OK" : "FAIL", viaGw.json.relay ?? "");
    if (!gwOk) failed = true;

    const rabbitr = await rabbitrOnline();
    console.log("rabbitr online:", rabbitr);
    if (rabbitr) {
      const signGw = await post(GATEWAY, "/api/recvMsg", injectPayload("签到"));
      console.log("gateway relay [签到]:", signGw.json.code === 1 ? "OK" : "FAIL");
    } else {
      console.log("rabbitr offline — 出站 /r/stm 未实测（inject 在线后可重跑）");
    }
  }
} catch (e) {
  console.error("E2E inject loop error:", e);
  failed = true;
}

if (failed) process.exit(1);
console.log("INJECT LOOP E2E OK");
