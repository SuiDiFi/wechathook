const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const API = "https://api.wxmtu.com/api";
const OUT = path.join(__dirname, "..", "reference", "mtrobot-agent-portal", "api-samples", "full-sync");
const USER = process.env.MTROBOT_AGENT_USER || "88888";
const PASS = process.env.MTROBOT_AGENT_PASS || "000000";
const DELAY = 150;

const HEADERS_BASE = {
  "Content-Type": "application/json",
  Accept: "application/json",
  from: "vh5",
  Origin: "https://wx.wxmtu.com",
  Referer: "https://wx.wxmtu.com/agent",
  "User-Agent": "Mozilla/5.0",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
          parsed = { raw: b };
        }
        resolve({ status: res.statusCode, parsed });
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function saveJson(rel, data) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(data, null, 2));
}

function extractOpsFromMenus(menus) {
  const srcOps = new Set();
  const listOps = new Set();
  const routes = new Set();
  for (const group of menus.menu || []) {
    for (const item of group.list || []) {
      routes.add({ title: item.title, to: item.to, group: group.title });
      const m1 = item.to?.match(/^\/agent-src-(.+)$/);
      if (m1) srcOps.add(m1[1]);
      const m2 = item.to?.match(/^\/agent-list-(.+)$/);
      if (m2) listOps.add(m2[1]);
    }
  }
  return { srcOps: [...srcOps], listOps: [...listOps], routes };
}

async function login() {
  const r = await post("/Agent/login", { username: USER, password: PASS });
  if (!r.parsed?.data?.token) throw new Error(`Login failed: ${r.parsed?.message}`);
  return { token: r.parsed.data.token, uid: r.parsed.data.uid };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log("Login...");
  const session = await login();
  saveJson("_meta/session.json", { uid: session.uid, syncedAt: new Date().toISOString() });

  const menusPath = path.join(__dirname, "..", "reference", "mtrobot-agent-portal", "api-samples", "agent-menus.json");
  let menus;
  if (fs.existsSync(menusPath)) {
    menus = JSON.parse(fs.readFileSync(menusPath, "utf8"));
  } else {
    const r = await post("/Agent/menus", {}, session);
    menus = r.parsed?.data || r.parsed;
    saveJson("Agent/menus.json", menus);
  }

  const { srcOps, listOps, routes } = extractOpsFromMenus(menus);
  saveJson("_meta/routes-index.json", routes);

  const summary = { ok: [], fail: [], skipped: [] };

  console.log(`Sync Agent/srcGet x ${srcOps.length}...`);
  for (const op of srcOps.sort()) {
    try {
      const r = await post("/Agent/srcGet", { op }, session);
      const ok = r.parsed?.status === 1;
      saveJson(`Agent/srcGet/${op}.json`, r.parsed);
      (ok ? summary.ok : summary.fail).push({ type: "Agent/srcGet", op, message: r.parsed?.message });
      console.log(ok ? "OK" : "FAIL", op, r.parsed?.message);
      await sleep(DELAY);
    } catch (e) {
      summary.fail.push({ type: "Agent/srcGet", op, error: String(e) });
    }
  }

  // agent-list pages at agent level - try Agent/srcGet first, then srcListFrom group_id=0
  console.log(`Sync agent-list x ${listOps.length}...`);
  for (const op of listOps.sort()) {
    try {
      let r = await post("/Agent/srcGet", { op }, session);
      if (r.parsed?.status !== 1) {
        r = await post("/GroupCenterSrc/srcListFrom", { op, group_id: 0 }, session);
      }
      const ok = r.parsed?.status === 1;
      saveJson(`Agent/srcList/${op}.json`, r.parsed);
      (ok ? summary.ok : summary.fail).push({ type: "agent-list", op, message: r.parsed?.message });
      console.log(ok ? "OK" : "FAIL", "list", op);
      await sleep(DELAY);
    } catch (e) {
      summary.fail.push({ type: "agent-list", op, error: String(e) });
    }
  }

  const platformApis = [
    ["/Agent/index", {}],
    ["/Setting/index", {}],
    ["/Product/getList", {}],
    ["/Product/getProductEntry", {}],
    ["/Product/getExitBlock", {}],
    ["/Codes/getList", { page: 1, limit: 100 }],
    ["/Template/getList", {}],
    ["/Buy/getProduct", {}],
    ["/Arcade/getTabs", {}],
    ["/Arcade/getList", {}],
    ["/SuperBaby/getList", {}],
    ["/Member/index", {}],
    ["/Member/menu", {}],
    ["/user.pc/index", {}],
    ["/user.auth/index", {}],
    ["/user.mac/index", {}],
    ["/user.proxy/index", {}],
    ["/sever/index", {}],
  ];

  console.log(`Sync platform APIs x ${platformApis.length}...`);
  for (const [ep, body] of platformApis) {
    try {
      const r = await post(ep, body, session);
      const safe = ep.replace(/^\//, "").replace(/\//g, "_");
      saveJson(`platform/${safe}.json`, r.parsed);
      const ok = r.parsed?.status === 1;
      (ok ? summary.ok : summary.fail).push({ type: "platform", ep, message: r.parsed?.message });
      console.log(ok ? "OK" : "FAIL", ep);
      await sleep(DELAY);
    } catch (e) {
      summary.fail.push({ type: "platform", ep, error: String(e) });
    }
  }

  // codes sub-pages often reuse Agent/srcGet with specific ops
  const codeOps = ["setting", "asetting", "entry", "block", "product"];
  for (const op of codeOps) {
    try {
      const r = await post("/Agent/srcGet", { op }, session);
      saveJson(`Agent/codes/${op}.json`, r.parsed);
      await sleep(DELAY);
    } catch {
      /* ignore */
    }
  }

  saveJson("_meta/sync-summary.json", {
    ...summary,
    counts: {
      ok: summary.ok.length,
      fail: summary.fail.length,
      srcOps: srcOps.length,
      listOps: listOps.length,
    },
  });

  console.log("Done.", summary.ok.length, "ok,", summary.fail.length, "fail");
  console.log("Output:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
