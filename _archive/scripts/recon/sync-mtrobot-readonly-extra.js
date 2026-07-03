/**
 * 萌兔总代后台 — 只读 API 增量补全（列表分页 + 未采样读接口）
 *
 * 安全：白名单仅 get、srcGet、srcList、index、menus 等读接口；
 *       明确排除 srcPost、post、del、create、set、sync、restart 等写操作。
 *
 * 用法:
 *   $env:MTROBOT_AGENT_USER="88888"
 *   $env:MTROBOT_AGENT_PASS="***"
 *   node scripts/sync-mtrobot-readonly-extra.js
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const API = "https://api.wxmtu.com/api";
const ROOT = path.join(__dirname, "..", "reference", "mtrobot-agent-portal");
const OUT = path.join(ROOT, "api-samples", "full-sync", "read-only-extra");
const API_PATHS_FILE = path.join(ROOT, "api-paths.txt");
const USER = process.env.MTROBOT_AGENT_USER || "88888";
const PASS = process.env.MTROBOT_AGENT_PASS || "000000";
const DELAY = 180;
const PAGE_LIMIT = 100;
const MAX_PAGES = 200;
const SKIP_GROUPS = process.env.READONLY_EXTRA_SKIP_GROUPS === "1";
const SINGLES_ONLY = process.env.READONLY_EXTRA_SINGLES_ONLY === "1";

const HEADERS_BASE = {
  "Content-Type": "application/json",
  Accept: "application/json",
  from: "vh5",
  Origin: "https://wx.wxmtu.com",
  Referer: "https://wx.wxmtu.com/agent",
  "User-Agent": "Mozilla/5.0",
};

/** 写操作 / 有副作用 — 永不调用 */
const BLOCKED = new Set([
  "/Agent/srcPost",
  "/Agent/saveFile",
  "/Codes/create",
  "/Codes/post",
  "/Feedbook/post",
  "/Group/postGroupPass",
  "/Group/quitGroup",
  "/Group/refresh",
  "/Group/selectGroup",
  "/Group/setOpenStatus",
  "/Group/openState",
  "/GroupCenter/setDefault",
  "/GroupCenter/setSync",
  "/GroupCenter/checkPassword",
  "/GroupCenterSrc/addList",
  "/GroupCenterSrc/clearList",
  "/GroupCenterSrc/del",
  "/GroupCenterSrc/delList",
  "/GroupCenterSrc/post",
  "/GroupCenterSrc/postList",
  "/GroupCenterSrc/postListButton",
  "/GroupCenterSrc/postSubmit",
  "/GroupCenterSrc/saveFile",
  "/GroupCenterSrc/srcPost",
  "/GroupCenterSrc/srcSelect",
  "/Member/unBind",
  "/Order/createOrder",
  "/Product/del",
  "/Product/post",
  "/Product/setExitBlock",
  "/Product/setProductEntry",
  "/Product/sync",
  "/Product/syncEntry",
  "/Template/del",
  "/Template/switch",
  "/group/reduceGroup",
  "/member/del",
  "/member/enable",
  "/member/outLogin",
  "/sever/add",
  "/sever/close",
  "/sever/delete",
  "/sever/edit",
  "/sever/link",
  "/sever/open",
  "/sever/reinstall",
  "/sever/reset",
  "/sever/restart",
]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const crypto = require("node:crypto");

function safeName(ep) {
  return ep.replace(/^\//, "").replace(/\//g, "_");
}

function bodySuffix(body) {
  if (!body || !Object.keys(body).length) return "";
  const hash = crypto.createHash("md5").update(JSON.stringify(body)).digest("hex").slice(0, 8);
  return `__${hash}`;
}

function saveJson(rel, data) {
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(data, null, 2));
}

function post(endpoint, body, session, method = "POST") {
  return new Promise((resolve, reject) => {
    const data = body != null ? JSON.stringify(body) : "";
    const headers = { ...HEADERS_BASE };
    if (method === "GET") {
      delete headers["Content-Type"];
    } else {
      headers["Content-Length"] = Buffer.byteLength(data);
    }
    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
      headers.token = session.token;
      headers.uid = String(session.uid);
    }
    const req = https.request(`${API}${endpoint}`, { method, headers }, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(b);
        } catch {
          parsed = { raw: b.slice(0, 5000) };
        }
        resolve({ status: res.statusCode, parsed });
      });
    });
    req.on("error", reject);
    if (method !== "GET" && data) req.write(data);
    req.end();
  });
}

async function callApi(endpoint, body, session, method = "POST") {
  const r = await post(endpoint, body, session, method);
  await sleep(DELAY);
  return r.parsed;
}

async function login() {
  const r = await post("/Agent/login", { username: USER, password: PASS });
  if (!r.parsed?.data?.token) throw new Error(`Login failed: ${r.parsed?.message}`);
  return { token: r.parsed.data.token, uid: r.parsed.data.uid };
}

function loadMenus() {
  const candidates = [
    path.join(ROOT, "api-samples", "agent-menus.json"),
    path.join(ROOT, "api-samples", "full-sync", "Agent", "menus.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  }
  return null;
}

function extractOpsFromMenus(menus) {
  const srcOps = new Set();
  const listOps = new Set();
  for (const group of menus?.menu || []) {
    for (const item of group.list || []) {
      const m1 = item.to?.match(/^\/agent-src-(.+)$/);
      if (m1) srcOps.add(m1[1]);
      const m2 = item.to?.match(/^\/agent-list-(.+)$/);
      if (m2) listOps.add(m2[1]);
      const m3 = item.to?.match(/^\/group-src-(.+)$/);
      if (m3) srcOps.add(m3[1]);
      const m4 = item.to?.match(/^\/group-list-(.+)$/);
      if (m4) listOps.add(m4[1]);
    }
  }
  return { srcOps: [...srcOps], listOps: [...listOps] };
}

function collectGroupIds(memberIndex, groupList, unused) {
  const ids = new Set();
  const add = (g) => {
    const id = g?.id ?? g?.group_id;
    if (typeof id === "number" && id > 0) ids.add(id);
  };
  for (const g of memberIndex?.data?.groups || memberIndex?.groups || []) add(g);
  for (const g of groupList || []) add(g);
  for (const g of unused?.data?.list || unused?.list || []) add(g);
  return [...ids].sort((a, b) => a - b);
}

async function paginateList(session, endpoint, buildBody, listKey = "list") {
  const allItems = [];
  let page = 1;
  let total = null;
  const pages = [];

  while (page <= MAX_PAGES) {
    const body = buildBody(page, PAGE_LIMIT);
    const parsed = await callApi(endpoint, body, session);
    pages.push({ page, body, response: parsed });

    if (parsed?.status !== 1) break;

    const data = parsed.data ?? parsed;
    const list = Array.isArray(data?.[listKey])
      ? data[listKey]
      : Array.isArray(data)
        ? data
        : [];
    allItems.push(...list);

    const t = data?.total ?? data?.count;
    if (typeof t === "number") total = t;

    if (list.length < PAGE_LIMIT) break;
    if (total != null && allItems.length >= total) break;
    page += 1;
  }

  return { total, pages: pages.length, items: allItems, pageResponses: pages };
}

function isReadOnlyPath(ep) {
  if (BLOCKED.has(ep)) return false;
  const leaf = ep.split("/").pop() || "";
  const writeWords = /^(post|del|delete|create|add|edit|update|set|sync|switch|move|change|renew|restart|reset|reinstall|open|close|logout|unbind|enable|pass|pass2|share|link|up|save|clear|quit|reduce|twiceLogin|loginGroup|postCaptcha)$/i;
  if (writeWords.test(leaf)) return false;
  const readWords = /^(get|index|menus|srcGet|srcList|srcListFrom|find|count|notice|isLogin|captcha|servers|checkStatus|getList|getTabs|getProduct|getField|getProductEntry|getExitBlock|getOpenStatus|getUnusedList|getGroupMenu|getGroupDefMenu|getContent|getQrCode|getWxAuthUrl|getWxAuthInfo|getWxJsSdkInfo|getPublicProxy|nodes|proxies|spirit|wish|checkOrder|loginStatus|menu|ipad|analysis)$/i;
  return readWords.test(leaf);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const summary = { ok: [], fail: [], skipped: [], syncedAt: new Date().toISOString() };

  console.log("Login...");
  const session = await login();
  saveJson("_meta/session.json", { uid: session.uid, syncedAt: summary.syncedAt });

  let menus = loadMenus();
  if (!menus) {
    menus = (await callApi("/Agent/menus", {}, session))?.data;
    saveJson("_meta/menus.json", menus);
  }
  const { srcOps, listOps } = extractOpsFromMenus(menus);

  // ── 1. 单次只读端点（api-paths 白名单 + 手工补充） ──
  const singleEndpoints = [
    ["/Login/isLogin", {}, "GET"],
    ["/Setting/count", { type: 0 }],
    ["/Setting/count", { type: 1 }],
    ["/Help/index", {}],
    ["/Help/notice", {}],
    ["/Product/getProduct", {}],
    ["/Product/getField", { id: 3035 }],
    ["/Product/getField", { id: 3036 }],
    ["/Group/get", { search: "", id: 0 }],
    ["/Group/getUnusedList", {}],
    ["/Member/ipad", { proxy: 0 }],
    ["/user.proxy/getPublicProxy", {}],
    ["/user.proxy/nodes", {}],
    ["/user.proxy/proxies", {}],
    ["/user.pc/servers", {}],
    ["/user.auth/servers", {}],
    ["/user.mac/servers", {}],
    ["/user.pc/checkStatus", {}],
    ["/user.auth/checkStatus", {}],
    ["/user.mac/checkStatus", {}],
    ["/index/getWxJsSdkInfo", { url: "https://wx.wxmtu.com/agent" }],
    ["/SuperBaby/spirit", {}],
    ["/SuperBaby/wish", { op: "babies", group_id: 0, limit: 10, page: 1, search: "", sort: "" }],
    ["/GroupCenter/getGroupMenu", null, "GET"],
    ["/GroupCenter/getGroupDefMenu", null, "GET"],
    ["/Account/getQrCode", {}],
    ["/sever/check", {}],
  ];

  const apiPaths = fs.existsSync(API_PATHS_FILE)
    ? fs.readFileSync(API_PATHS_FILE, "utf8").trim().split("\n").filter(Boolean)
    : [];
  for (const ep of apiPaths) {
    if (!isReadOnlyPath(ep)) continue;
    if (ep.includes("groupId") || ep.includes("/id/") || ep.endsWith("/")) continue;
    const leaf = ep.split("/").pop();
    if (["srcGet", "srcPost", "getList", "login", "menus", "index"].includes(leaf)) continue;
    if (singleEndpoints.some(([e]) => e === ep)) continue;
    singleEndpoints.push([ep, {}]);
  }

  console.log(`Single read endpoints x ${singleEndpoints.length}...`);
  for (const [ep, body, method = "POST"] of singleEndpoints) {
    try {
      const parsed = await callApi(ep, body, session, method);
      const suffix = bodySuffix(body);
      saveJson(`single/${safeName(ep)}${suffix}.json`, parsed);
      const ok = parsed?.status === 1 || parsed?.message === "is user";
      (ok ? summary.ok : summary.fail).push({ type: "single", ep, body, message: parsed?.message });
      console.log(ok ? "OK" : "FAIL", ep);
    } catch (e) {
      summary.fail.push({ type: "single", ep, error: String(e) });
    }
  }

  // ── 2. 分页列表 ──
  if (!SINGLES_ONLY) {
  console.log("Paginated Codes/getList...");
  const codesMerged = await paginateList(
    session,
    "/Codes/getList",
    (page, limit) => ({ page, limit, type: 0, status: 2 }),
  );
  saveJson("paginated/Codes_getList_merged.json", {
    total: codesMerged.total,
    itemCount: codesMerged.items.length,
    pages: codesMerged.pages,
    list: codesMerged.items,
  });
  for (const st of [0, 1]) {
    const r = await paginateList(
      session,
      "/Codes/getList",
      (page, limit) => ({ page, limit, type: 0, status: st }),
    );
    saveJson(`paginated/Codes_getList_status${st}_merged.json`, {
      total: r.total,
      itemCount: r.items.length,
      list: r.items,
    });
  }

  console.log("Paginated Template/getList...");
  const tplMerged = await paginateList(
    session,
    "/Template/getList",
    (page, limit) => ({ page, limit, search: "" }),
  );
  saveJson("paginated/Template_getList_merged.json", {
    total: tplMerged.total,
    itemCount: tplMerged.items.length,
    pages: tplMerged.pages,
    list: tplMerged.items,
  });

  console.log("Paginated Group/get...");
  const groupMerged = await paginateList(
    session,
    "/Group/get",
    (page, limit) => ({ search: "", id: 0, page, limit }),
  );
  saveJson("paginated/Group_get_merged.json", {
    total: groupMerged.total,
    itemCount: groupMerged.items.length,
    list: groupMerged.items,
  });

  const tabsResp = await callApi("/Arcade/getTabs", {}, session);
  saveJson("single/Arcade_getTabs.json", tabsResp);
  const tabs = tabsResp?.data?.tabs || [];
  for (const tab of tabs) {
    const arcade = await paginateList(
      session,
      "/Arcade/getList",
      (page, limit) => ({ page, limit, type: tab.key, search: "", group_id: 0, op: "" }),
    );
    saveJson(`paginated/Arcade_getList_type${tab.key}_merged.json`, {
      tab,
      itemCount: arcade.items.length,
      list: arcade.items,
    });
  }

  }

  // ── 3. 发现群 ID，拉群级只读配置 ──
  if (SINGLES_ONLY || SKIP_GROUPS) {
    saveJson("_meta/extra-sync-summary.json", {
      ...summary,
      counts: { ok: summary.ok.length, fail: summary.fail.length, skipped: summary.skipped.length },
      note: SINGLES_ONLY ? "singles-only run" : "groups skipped",
    });
    console.log("Done (singles only).", summary.ok.length, "ok,", summary.fail.length, "fail");
    console.log("Output:", OUT);
    return;
  }

  const memberIndex = await callApi("/Member/index", {}, session);
  saveJson("single/Member_index.json", memberIndex);
  const unused = await callApi("/Group/getUnusedList", {}, session);
  saveJson("single/Group_getUnusedList.json", unused);

  const groupIds = collectGroupIds(memberIndex, groupMerged.items, unused);
  saveJson("_meta/discovered-group-ids.json", { groupIds, count: groupIds.length });

  console.log(`Group-level read sync x ${groupIds.length} groups...`);
  for (const groupId of groupIds.slice(0, 50)) {
    const gdir = `groups/${groupId}`;
    try {
      const gc = await callApi("/GroupCenter/get", { group_id: groupId, user_type: 0 }, session);
      saveJson(`${gdir}/GroupCenter_get.json`, gc);

      await callApi("/Group/getOpenStatus", { group_id: groupId }, session).then((r) =>
        saveJson(`${gdir}/Group_getOpenStatus.json`, r),
      );

      for (const op of srcOps.slice(0, 120)) {
        const r = await callApi(
          "/GroupCenterSrc/srcGet",
          { group_id: groupId, op, op_id: 0 },
          session,
        );
        if (r?.status === 1) saveJson(`${gdir}/GroupCenterSrc_srcGet/${op}.json`, r);
      }

      for (const op of listOps) {
        const r = await callApi(
          "/GroupCenterSrc/srcListFrom",
          { group_id: groupId, op },
          session,
        );
        if (r?.status === 1) saveJson(`${gdir}/GroupCenterSrc_srcListFrom/${op}.json`, r);

        const gl = await paginateList(
          session,
          "/GroupCenterSrc/getList",
          (page, limit) => ({ group_id: groupId, op, page, limit, search: "" }),
        );
        if (gl.items.length || gl.pages > 0) {
          saveJson(`${gdir}/GroupCenterSrc_getList/${op}_merged.json`, {
            itemCount: gl.items.length,
            list: gl.items,
          });
        }
      }

      summary.ok.push({ type: "group", groupId });
      console.log("OK group", groupId);
    } catch (e) {
      summary.fail.push({ type: "group", groupId, error: String(e) });
      console.log("FAIL group", groupId);
    }
  }

  saveJson("_meta/extra-sync-summary.json", {
    ...summary,
    counts: {
      ok: summary.ok.length,
      fail: summary.fail.length,
      skipped: summary.skipped.length,
      groupIds: groupIds.length,
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
