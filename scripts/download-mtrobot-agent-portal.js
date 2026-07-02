/**
 * 萌兔总代后台 H5 全量静态资源归档 + 登录态只读 API 采样
 * 用法:
 *   $env:MTROBOT_AGENT_USER="88888"
 *   $env:MTROBOT_AGENT_PASS="000000"
 *   node scripts/download-mtrobot-agent-portal.js
 *
 * 安全: 凭据仅来自环境变量，不写入仓库；API 采样仅 GET/空 POST，不修改后台配置。
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const http = require("node:http");
const { URL } = require("node:url");

const BASE = "https://wx.wxmtu.com";
const AGENT_BASE = `${BASE}/agent`;
const API_BASE = "https://api.wxmtu.com/api";
const OUT = path.join(__dirname, "..", "reference", "mtrobot-agent-portal");

const USER = process.env.MTROBOT_AGENT_USER || "";
const PASS = process.env.MTROBOT_AGENT_PASS || "";
const TOKEN = process.env.MTROBOT_AGENT_TOKEN || "";
const UID = process.env.MTROBOT_AGENT_UID || "";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function fetchUrl(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(
      url,
      {
        method: opts.method || "GET",
        headers: opts.headers || {},
        timeout: 120000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            text: () => body.toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`timeout: ${url}`)));
    if (opts.body != null) req.write(opts.body);
    req.end();
  });
}

function agentLocalPath(url) {
  const u = new URL(url);
  let p = decodeURIComponent(u.pathname);
  if (p === "/agent" || p === "/agent/") {
    return path.join("agent", "index.html");
  }
  if (p.startsWith("/agent/") && !path.extname(p)) {
    return path.join("agent", "index.html");
  }
  // 根路径资源: /css /js /static /img /favicon.ico
  return p.replace(/^\//, "").replace(/\.\./g, "_");
}

async function downloadTo(url, dest) {
  ensureDir(path.dirname(dest));
  const res = await fetchUrl(url);
  if (res.status >= 400) return { url, ok: false, status: res.status };
  fs.writeFileSync(dest, res.body);
  return { url, ok: true, status: res.status, size: res.body.length, dest };
}

function extractHtmlAssets(html, pageUrl) {
  const out = new Set();
  const base = new URL(pageUrl);
  for (const re of [/(?:src|href)=["']([^"']+)["']/gi]) {
    let m;
    while ((m = re.exec(html))) {
      const ref = m[1].trim();
      if (!ref || ref.startsWith("data:") || ref.startsWith("javascript:")) continue;
      try {
        out.add(new URL(ref, base).href);
      } catch {
        /* ignore */
      }
    }
  }
  return [...out];
}

function extractWebpackAssets(jsText) {
  const assets = new Set();
  for (const re of [
    /n\.p\+["']([^"']+)["']/g,
    /["'](img\/[^"']+\.(?:png|jpg|jpeg|gif|svg|webp))["']/g,
    /["'](fonts\/[^"']+)["']/g,
    /url\(["']?([^"')]+\.(?:woff2?|ttf|eot|svg|png|jpg))["']?\)/g,
  ]) {
    let m;
    while ((m = re.exec(jsText))) assets.add(m[1]);
  }
  return [...assets];
}

function extractRoutesAndApis(jsText) {
  const routes = new Set();
  const apis = new Set();
  let m;
  const routeRe = /path:\s*["']([^"']+)["']/g;
  while ((m = routeRe.exec(jsText))) routes.add(m[1]);
  const apiRe = /yu\+["'](\/[^"']+)["']/g;
  while ((m = apiRe.exec(jsText))) apis.add(m[1]);
  for (const re of [
    /["'](\/(?:Agent|Group|GroupCenter|GroupCenterSrc|Arcade|Login|Account|Member|Product|Codes|Order|Buy|Template|SuperBaby|Auth|Setting|Pay|Feedbook|Help|Display|Analysis|Immortal|Baby|Spirit)[^"']*)["']/g,
  ]) {
    while ((m = re.exec(jsText))) apis.add(m[1]);
  }
  return {
    routes: [...routes].sort(),
    apis: [...apis].sort(),
  };
}

function extractApiUtilMap(jsText) {
  const map = {};
  const blockRe = /(\w+):\{login:function|(\w+):\{get:function/g;
  // Parse $ApiUtil sections from minified bundle
  const sections = [
    "Agent", "Login", "Group", "GroupCenter", "GroupCenterSrc",
    "Arcade", "Member", "Product", "Codes", "Order", "Buy", "Template",
    "SuperBaby", "Account", "Auth",
  ];
  for (const sec of sections) {
    const re = new RegExp(`${sec}:\\{([^}]{0,8000})\\}`, "g");
    let m;
    while ((m = re.exec(jsText))) {
      const inner = m[1];
      const methods = [];
      for (const fm of inner.matchAll(/(\w+):function/g)) methods.push(fm[1]);
      if (methods.length) map[sec] = [...new Set(methods)].sort();
    }
  }
  return map;
}

async function apiRequest(method, endpoint, body, session) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    from: "vh5",
  };
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
    headers.token = session.token;
  }
  if (session?.uid) headers.uid = String(session.uid);

  const opts = { method, headers };
  if (method !== "GET" && body != null) opts.body = JSON.stringify(body);

  const res = await fetchUrl(url, opts);
  let parsed;
  try {
    parsed = JSON.parse(res.text());
  } catch {
    parsed = null;
  }
  return { url, method, status: res.status, parsed, raw: res.text().slice(0, 200000) };
}

async function agentLogin() {
  const r = await apiRequest("POST", "/Agent/login", { username: USER, password: PASS });
  const token = r.parsed?.data?.token;
  const uid = r.parsed?.data?.uid;
  const ok =
    Boolean(token) &&
    (r.parsed?.status === 1 || r.parsed?.status === true || r.parsed?.status === "1");
  return {
    ok,
    token,
    uid,
    message: r.parsed?.message,
    hint:
      r.parsed?.message === "error is exist"
        ? "服务端可能已有同账号在线会话；请先在浏览器退出登录后再重试脚本。"
        : undefined,
    response: { status: r.status, body: r.parsed },
  };
}

/** 只读采样 — 不包含任何 POST 写操作 */
async function sampleReadOnlyApis(session) {
  const readEndpoints = [
    ["POST", "/Agent/menus", {}],
    ["POST", "/Agent/index", {}],
    ["POST", "/Login/isLogin", {}],
    ["POST", "/Account/loginStatus", {}],
    ["POST", "/Setting/index", {}],
    ["POST", "/Setting/count", {}],
    ["POST", "/Help/index", {}],
    ["POST", "/Help/notice", {}],
    ["POST", "/Product/getList", {}],
    ["POST", "/Product/getField", {}],
    ["POST", "/Template/getList", {}],
    ["POST", "/Codes/getList", {}],
    ["POST", "/Buy/getProduct", {}],
    ["POST", "/Arcade/getTabs", {}],
    ["POST", "/Arcade/getList", {}],
    ["POST", "/SuperBaby/getList", {}],
    ["POST", "/Member/menu", {}],
    ["POST", "/Member/index", {}],
    ["POST", "/Group/getUnusedList", {}],
    ["POST", "/sever/index", {}],
    ["POST", "/user.pc/index", {}],
    ["POST", "/user.proxy/index", {}],
    ["POST", "/user.auth/index", {}],
  ];

  const out = {};
  for (const [method, ep, body] of readEndpoints) {
    try {
      const r = await apiRequest(method, ep, body, session);
      out[`${method} ${ep}`] = {
        httpStatus: r.status,
        apiStatus: r.parsed?.status,
        message: r.parsed?.message,
        dataPreview: JSON.stringify(r.parsed?.data ?? r.parsed).slice(0, 100000),
      };
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      out[`${method} ${ep}`] = { error: String(e) };
    }
  }
  return out;
}

function parseAgentShell(html) {
  const assets = [];
  for (const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    const ref = m[1].trim();
    if (!ref || ref.startsWith("data:")) continue;
    // nginx 将 /agent/css|js 回退为 index.html；真实资源在站点根 /css /js /static
    if (ref.startsWith("css/") || ref.startsWith("js/") || ref.startsWith("static/")) {
      assets.push(`${BASE}/${ref}`);
    } else if (ref === "favicon.ico") {
      assets.push(`${BASE}/favicon.ico`);
    }
  }
  return assets;
}

async function crawlStatic() {
  const log = [];
  const queue = new Set([`${AGENT_BASE}/`, `${AGENT_BASE}/index.html`, `${BASE}/favicon.ico`]);
  const seen = new Set();
  const allRoutes = new Set();
  const allApis = new Set();
  let apiUtilMap = {};

  while (queue.size) {
    const batch = [...queue];
    queue.clear();
    for (const url of batch) {
      if (seen.has(url)) continue;
      seen.add(url);

      const rel = agentLocalPath(url);
      const dest = path.join(OUT, "static", rel);

      try {
        const result = await downloadTo(url, dest);
        log.push({ ...result, rel });
        if (!result.ok) continue;

        const isHtml = dest.endsWith(".html");
        const isJs = dest.endsWith(".js");
        const isCss = dest.endsWith(".css");

        if (isHtml) {
          const html = fs.readFileSync(dest, "utf8");
          for (const a of parseAgentShell(html)) {
            if (!seen.has(a)) queue.add(a);
          }
          for (const a of extractHtmlAssets(html, url)) {
            if (a.startsWith(BASE) && !seen.has(a)) queue.add(a);
          }
        }

        if (isJs) {
          const text = fs.readFileSync(dest, "utf8");
          const { routes, apis } = extractRoutesAndApis(text);
          routes.forEach((r) => allRoutes.add(r));
          apis.forEach((a) => allApis.add(a));
          apiUtilMap = { ...apiUtilMap, ...extractApiUtilMap(text) };

          for (const asset of extractWebpackAssets(text)) {
            const assetUrl = `${BASE}/${asset.replace(/^\//, "")}`;
            if (!seen.has(assetUrl)) queue.add(assetUrl);
          }
        }

        if (isCss) {
          const text = fs.readFileSync(dest, "utf8");
          for (const m of text.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
            const ref = m[1].trim();
            if (ref.startsWith("data:")) continue;
            try {
              const assetUrl = new URL(ref, url).href;
              if (assetUrl.startsWith(BASE) && !seen.has(assetUrl)) queue.add(assetUrl);
            } catch {
              /* ignore */
            }
          }
        }

        console.log("OK", result.size, rel);
      } catch (e) {
        log.push({ url, ok: false, error: String(e) });
        console.error("ERR", url, e.message);
      }
    }
  }

  return { log, allRoutes, allApis, apiUtilMap };
}

async function main() {
  ensureDir(OUT);
  console.log("Output:", OUT);
  console.log("=== Phase 1: static assets ===");

  const { log, allRoutes, allApis, apiUtilMap } = await crawlStatic();

  fs.writeFileSync(path.join(OUT, "download-log.json"), JSON.stringify(log, null, 2));

  const manifest = {
    downloadedAt: new Date().toISOString(),
    portalUrl: `${BASE}/agent`,
    apiBase: API_BASE,
    note: "Vue SPA 编译产物；无 .vue 源码。所有页面组件打包在 js/app.*.js 单文件中。",
    fileCount: log.filter((x) => x.ok).length,
    totalBytes: log.filter((x) => x.ok).reduce((s, x) => s + (x.size || 0), 0),
    routes: [...allRoutes].sort(),
    apiPaths: [...allApis].sort(),
    apiUtilMethods: apiUtilMap,
  };

  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(OUT, "routes.txt"), manifest.routes.join("\n"));
  fs.writeFileSync(path.join(OUT, "api-paths.txt"), manifest.apiPaths.join("\n"));
  fs.writeFileSync(
    path.join(OUT, "api-util-map.json"),
    JSON.stringify(apiUtilMap, null, 2),
  );

  if (TOKEN) {
    console.log("=== Phase 2: read-only API sampling (token from env) ===");
    const authDir = path.join(OUT, "api-samples");
    ensureDir(authDir);
    const session = { token: TOKEN, uid: UID };
    const samples = await sampleReadOnlyApis(session);
    fs.writeFileSync(
      path.join(authDir, "read-only-samples.json"),
      JSON.stringify(samples, null, 2),
    );
    console.log("Done with token.", manifest.fileCount, "files");
    return;
  }

  if (!USER || !PASS) {
    console.log("Skip login: set MTROBOT_AGENT_USER / MTROBOT_AGENT_PASS");
    console.log("Done static only.", manifest.fileCount, "files");
    return;
  }

  console.log("=== Phase 2: read-only API sampling ===");
  const authDir = path.join(OUT, "api-samples");
  ensureDir(authDir);

  const login = await agentLogin();
  fs.writeFileSync(
    path.join(authDir, "login-result.json"),
    JSON.stringify(
      {
        ok: login.ok,
        uid: login.uid,
        message: login.message,
        token: login.ok ? "***redacted***" : undefined,
        response: login.response,
      },
      null,
      2,
    ),
  );

  if (!login.ok) {
    console.log("Login failed:", login.message || "unknown");
    console.log("Done.", manifest.fileCount, "static files");
    return;
  }

  console.log("Login OK, uid:", login.uid);
  const session = { token: login.token, uid: login.uid };
  const samples = await sampleReadOnlyApis(session);

  const menusKey = "POST /Agent/menus";
  if (samples[menusKey]?.dataPreview) {
    try {
      fs.writeFileSync(
        path.join(authDir, "agent-menus.json"),
        JSON.stringify(JSON.parse(samples[menusKey].dataPreview), null, 2),
      );
    } catch {
      /* ignore */
    }
  }

  fs.writeFileSync(
    path.join(authDir, "read-only-samples.json"),
    JSON.stringify(samples, null, 2),
  );

  console.log("Done.", manifest.fileCount, "files,", manifest.routes.length, "routes");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
