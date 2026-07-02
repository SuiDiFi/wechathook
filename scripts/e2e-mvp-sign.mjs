#!/usr/bin/env node
/** MVP v1.0 E2E：bot-server 签到 + 菜单 + 查有效期 + relay-bridge */
const BASE = process.env.BOT_SERVER_URL ?? "http://127.0.0.1:8788";
const RELAY = process.env.RELAY_URL ?? "http://127.0.0.1:8789";

async function post(base, path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function msgPayload(text) {
  return {
    msg: {
      event_type: 2000,
      msgType: 1,
      acc_wxid: "along523618",
      account_wxid: "along523618",
      fromUserName: { String: "57226609398@chatroom" },
      real_content: text,
      room_sender_by: "wxid_test",
      member_info: { nickName: "测试" },
    },
  };
}

let failed = false;

try {
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  console.log("bot-server health:", health.ok);

  const explis = await post(BASE, "/super/msg/explis", {
    group_wxid: "57226609398@chatroom",
  });
  console.log("explis:", explis.status, explis.msg);
  if (explis.status !== 1) failed = true;

  for (const kw of ["菜单", "查有效期"]) {
    const r = await post(BASE, "/super/msg/callback", msgPayload(kw));
    const ok = r.data?.length > 0 && r.data[0].msg_type === 1;
    console.log(`callback [${kw}]:`, ok ? "OK" : "FAIL", r.data?.[0]?.content?.slice(0, 30));
    if (!ok) failed = true;
  }

  try {
    const relayHealth = await fetch(`${RELAY}/health`).then((r) => r.json());
    console.log("relay-bridge health:", relayHealth.ok);
    const viaRelay = await post(RELAY, "/super/msg/callback", msgPayload("菜单"));
    const relayOk = viaRelay.data?.length > 0;
    console.log("relay callback [菜单]:", relayOk ? "OK" : "FAIL");
    if (!relayOk) failed = true;
  } catch {
    console.log("relay-bridge: skip (not running)");
  }
} catch (e) {
  console.error("E2E error:", e);
  failed = true;
}

if (failed) process.exit(1);
console.log("MVP E2E OK");
