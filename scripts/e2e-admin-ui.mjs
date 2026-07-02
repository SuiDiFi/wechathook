#!/usr/bin/env node
const BASE = process.env.ADMIN_URL ?? "http://127.0.0.1:8790";

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json() };
}

async function get(path, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  return { status: res.status, json: await res.json() };
}

let failed = false;

try {
  const html = await fetch(`${BASE}/console/`);
  const page = await html.text();
  console.log("console login page:", page.includes("官方总控后台"), page.includes("remixicon"));
  if (!page.includes("btn-login")) failed = true;
  if (!page.includes("console.css")) failed = true;

  const unauth = await get("/api/master/dashboard");
  console.log("dashboard without auth:", unauth.status);
  if (unauth.status !== 401) failed = true;

  const badLogin = await post("/api/master/login", { username: "admin", password: "wrong" });
  if (badLogin.json.status !== 0) failed = true;

  const login = await post("/api/master/login", { username: "admin", password: "123456" });
  console.log("master login:", login.json.message);
  if (login.json.status !== 1) failed = true;
  const token = login.json.data?.token ?? "";

  const dash = await get("/api/master/dashboard", token);
  console.log("dashboard:", dash.json.data?.botServerOk, "agent:", dash.json.data?.agentEnabled);
  if (!dash.json.data) failed = true;

  const res = await get("/api/master/resources", token);
  console.log("resources groups:", res.json.data?.groups?.length ?? 0);
  if (res.json.status !== 1) failed = true;

  const agentLogin = await post("/api/Agent/login", { username: "1000", password: "000000" });
  if (agentLogin.json.status !== 1) failed = true;

  const agentHtml = await fetch(`${BASE}/agent/`);
  const agentPage = await agentHtml.text();
  console.log("agent portal ui:", agentPage.includes("总代个人后台"), agentPage.includes("console.css"));
  if (!agentPage.includes("总代个人后台")) failed = true;
  if (!agentPage.includes("/agent/app.js")) failed = true;

  const agentCenter = await fetch(`${BASE}/agent-center`, { redirect: "manual" });
  console.log("agent-center redirect:", agentCenter.status, agentCenter.headers.get("location"));
  if (agentCenter.status !== 302 && agentCenter.status !== 301) failed = true;
  if (!String(agentCenter.headers.get("location") || "").includes("/agent/")) failed = true;

  const agentAccount = await fetch(`${BASE}/agent-center-account`, { redirect: "manual" });
  console.log("agent-center-account redirect:", agentAccount.status, agentAccount.headers.get("location"));
  if (agentAccount.status !== 302 && agentAccount.status !== 301) failed = true;
  if (!String(agentAccount.headers.get("location") || "").includes("/agent/")) failed = true;

  const setting = await post("/api/Setting/index", {});
  console.log("setting title:", setting.json.data?.web_title);
  if (!setting.json.data?.web_title) failed = true;

  const agentIdx = await post("/api/Agent/index", {});
  console.log("agent index weichat:", agentIdx.json.data?.weichat_count);
  if (agentIdx.json.data?.weichat_count === undefined) failed = true;

  const img = await fetch(`${BASE}/img/center.51a840e4.png`);
  console.log("center bg img:", img.status, img.headers.get("content-type"));
  if (!img.ok || !img.headers.get("content-type")?.includes("image")) failed = true;

  const menus = await post("/api/Agent/menus", {});
  const menuItems = (menus.json.data?.menu ?? []).reduce((n, s) => n + (s.list?.length ?? 0), 0);
  console.log("agent menu items:", menuItems);
  if (menuItems < 10) failed = true;
} catch (e) {
  console.error(e);
  failed = true;
}

if (failed) process.exit(1);
console.log("MASTER CONSOLE E2E OK");
