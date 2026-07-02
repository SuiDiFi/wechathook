/**
 * 萌兔 IP 代理管理页 — 只读补采（参数格式来自 app.d31f1d00.js）
 *
 * 用法:
 *   node scripts/sync-mtrobot-proxy-readonly.js
 *
 * 安全: 仅 index/nodes/proxies/getPublicProxy 及 action:false 预览；不调用 create/add/renew/delete 等写接口。
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const crypto = require("node:crypto");

const API = "https://api.wxmtu.com/api";
const ROOT = path.join(__dirname, "..", "reference", "mtrobot-agent-portal");
const OUT = path.join(ROOT, "api-samples", "full-sync", "read-only-extra", "proxy");
const PARAMS_DOC = path.join(ROOT, "proxy-api-params.json");
const USER = process.env.MTROBOT_AGENT_USER || "88888";
const PASS = process.env.MTROBOT_AGENT_PASS || "000000";
const DELAY = 180;

const HEADERS_BASE = {
  "Content-Type": "application/json",
  Accept: "application/json",
  from: "vh5",
  Origin: "https://wx.wxmtu.com",
  Referer: "https://wx.wxmtu.com/agent",
  "User-Agent": "Mozilla/5.0",
};

const PROXY_TYPES = ["dc", "box", "edge"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function bodyHash(body) {
  return crypto.createHash("md5").update(JSON.stringify(body)).digest("hex").slice(0, 8);
}

function saveJson(rel, data) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(data, null, 2));
}

function post(endpoint, body, session) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body ?? {});
    const headers = {
      ...HEADERS_BASE,
      "Content-Length": Buffer.byteLength(data),
    };
    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
      headers.token = session.token;
      headers.uid = String(session.uid);
    }
    const req = https.request(`${API}${endpoint}`, { method: "POST", headers }, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(b);
        } catch {
          parsed = { raw: b.slice(0, 5000) };
        }
        resolve(parsed);
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function callApi(endpoint, body, session) {
  const parsed = await post(endpoint, body, session);
  await sleep(DELAY);
  return parsed;
}

async function login() {
  const r = await post("/Agent/login", { username: USER, password: PASS });
  if (!r?.data?.token) throw new Error(`Login failed: ${r?.message}`);
  return { token: r.data.token, uid: r.data.uid };
}

function loadProxyIds() {
  const p = path.join(ROOT, "api-samples", "full-sync", "platform", "user.proxy_index.json");
  if (!fs.existsSync(p)) return [];
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const list = j?.data?.proxy;
  return Array.isArray(list) ? list.map((x) => x.id).filter(Boolean) : [];
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const summary = { ok: [], fail: [], syncedAt: new Date().toISOString() };

  console.log("Login...");
  const session = await login();

  if (fs.existsSync(PARAMS_DOC)) {
    saveJson("_meta/params-source.json", JSON.parse(fs.readFileSync(PARAMS_DOC, "utf8")));
  }

  const indexBodies = [
    { has: 1, search: "" },
    { has: 1, search: "上海" },
    {},
  ];

  console.log("user.proxy/index x", indexBodies.length);
  for (const body of indexBodies) {
    const ep = "/user.proxy/index";
    try {
      const parsed = await callApi(ep, body, session);
      const ok = parsed?.status === 1;
      saveJson(`index__${bodyHash(body)}.json`, { request: body, response: parsed });
      (ok ? summary.ok : summary.fail).push({ ep, body, message: parsed?.message });
      console.log(ok ? "OK" : "FAIL", "index", JSON.stringify(body));
    } catch (e) {
      summary.fail.push({ ep: "/user.proxy/index", body, error: String(e) });
    }
  }

  console.log("user.proxy/nodes x", PROXY_TYPES.length);
  for (const type of PROXY_TYPES) {
    const ep = "/user.proxy/nodes";
    const body = { type };
    try {
      const parsed = await callApi(ep, body, session);
      const ok = parsed?.status === 1;
      saveJson(`nodes__type_${type}.json`, { request: body, response: parsed });
      (ok ? summary.ok : summary.fail).push({ ep, body, message: parsed?.message });
      console.log(ok ? "OK" : "FAIL", "nodes", type, parsed?.message);
    } catch (e) {
      summary.fail.push({ ep, body, error: String(e) });
    }
  }

  const staticReads = [
    ["/user.proxy/proxies", {}],
    ["/user.proxy/getPublicProxy", {}],
  ];
  for (const [ep, body] of staticReads) {
    try {
      const parsed = await callApi(ep, body, session);
      const ok = parsed?.status === 1;
      const name = ep.replace(/^\//, "").replace(/\//g, "_");
      saveJson(`${name}.json`, { request: body, response: parsed });
      (ok ? summary.ok : summary.fail).push({ ep, body, message: parsed?.message });
      console.log(ok ? "OK" : "FAIL", ep);
    } catch (e) {
      summary.fail.push({ ep, body, error: String(e) });
    }
  }

  console.log("Dry-run previews (action:false)...");
  try {
    const syncPreview = await callApi("/user.proxy/sync", { action: false }, session);
    saveJson("sync_preview__action_false.json", {
      request: { action: false },
      response: syncPreview,
    });
    (syncPreview?.status === 1 ? summary.ok : summary.fail).push({
      ep: "/user.proxy/sync",
      body: { action: false },
      message: syncPreview?.message,
    });
    console.log(syncPreview?.status === 1 ? "OK" : "FAIL", "sync preview");
  } catch (e) {
    summary.fail.push({ ep: "/user.proxy/sync", error: String(e) });
  }

  const proxyIds = loadProxyIds();
  if (proxyIds.length >= 2) {
    const body = { id: proxyIds[0], move_id: proxyIds[1], action: false };
    try {
      const parsed = await callApi("/user.proxy/move", body, session);
      saveJson("move_preview__action_false.json", { request: body, response: parsed });
      (parsed?.status === 1 ? summary.ok : summary.fail).push({
        ep: "/user.proxy/move",
        body,
        message: parsed?.message,
      });
      console.log(parsed?.status === 1 ? "OK" : "FAIL", "move preview");
    } catch (e) {
      summary.fail.push({ ep: "/user.proxy/move", error: String(e) });
    }
  } else {
    summary.fail.push({
      ep: "/user.proxy/move",
      skipped: true,
      reason: "need >=2 proxy ids in platform/user.proxy_index.json",
    });
    console.log("SKIP move preview (insufficient proxy ids)");
  }

  saveJson("_meta/proxy-sync-summary.json", {
    ...summary,
    counts: { ok: summary.ok.length, fail: summary.fail.length },
    proxyIdsUsed: proxyIds.slice(0, 2),
  });

  console.log("Done.", summary.ok.length, "ok,", summary.fail.length, "fail");
  console.log("Output:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
