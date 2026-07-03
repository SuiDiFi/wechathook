#!/usr/bin/env node
/** 云端-本地联调探针：admin → bot-server */
const ADMIN = process.env.ADMIN_URL ?? "http://127.0.0.1:8790";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const ROOM = "57226609398@chatroom";

function authHeaders(extra = {}) {
  const headers = { ...extra };
  if (ADMIN_TOKEN) headers.Authorization = `Bearer ${ADMIN_TOKEN}`;
  return headers;
}

async function get(path) {
  const res = await fetch(`${ADMIN}${path}`, { headers: authHeaders() });
  return { ok: res.ok, json: await res.json() };
}

async function post(path, body) {
  const res = await fetch(`${ADMIN}${path}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return { ok: res.ok, json: await res.json() };
}

let failed = false;

try {
  const health = await get("/health");
  console.log("admin health:", health.json.ok);
  if (!health.json.ok) failed = true;

  const status = await get("/api/status");
  console.log("bot-server via admin:", status.json.data?.botServerOk ? "OK" : "FAIL");
  if (!status.json.data?.botServerOk) failed = true;

  const ops = await post("/api/Agent/menus", {});
  console.log("Agent/menus sections:", ops.json.data?.menu?.length ?? 0);
  if ((ops.json.data?.menu?.length ?? 0) < 1) failed = true;

  const explis = await post("/api/proxy/super/explis", { group_wxid: ROOM });
  console.log("proxy explis:", explis.json.status, explis.json.msg);
  if (explis.json.status !== 1) failed = true;
} catch (e) {
  console.error("cloud-local E2E error:", e);
  failed = true;
}

if (failed) process.exit(1);
console.log("CLOUD-LOCAL E2E OK");
