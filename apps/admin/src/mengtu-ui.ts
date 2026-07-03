import fs from "node:fs";
import path from "node:path";
import type { Context, Hono } from "hono";
import { getMengtuAgentStaticRoot, getMengtuStaticRoot, registerMengtuApiRoutes } from "./mengtu-api.js";
import { loadSpaRoutes } from "./mengtu-samples.js";
import type { AdminConfig } from "./config.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

/** 萌兔官方 H5 静态资源与 wx.wxmtu.com 同构：css/js/img 在站点根，/agent/ 仅为 SPA 入口 */
export function mountMengtuAgentUi(app: Hono, config: AdminConfig, projectRoot: string): void {
  const staticRoot = getMengtuStaticRoot(projectRoot);
  const agentRoot = getMengtuAgentStaticRoot(projectRoot);
  const adaptiveDir = path.join(projectRoot, "apps/admin/public/mengtu");

  registerMengtuApiRoutes(app as Parameters<typeof registerMengtuApiRoutes>[0], config, projectRoot);

  mountWechathookAdaptive(app, adaptiveDir);

  const serveConfigJs = (c: Context) => {
    const forwardedProto = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
    const forwardedHost = c.req.header("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost ?? c.req.header("host") ?? new URL(c.req.url).host;
    const proto = forwardedProto ?? new URL(c.req.url).protocol.replace(":", "");
    const origin = `${proto}://${host}`;
    return c.text(`window.g = { site: '${origin}/' };`, 200, {
      "Content-Type": "application/javascript; charset=utf-8",
    });
  };

  app.get("/static/config.js", serveConfigJs);
  app.get("/agent/static/config.js", serveConfigJs);

  mountAssetDir(app, staticRoot, "css");
  mountAssetDir(app, staticRoot, "js");
  mountAssetDir(app, staticRoot, "img");
  mountAgentAssetAlias(app, staticRoot, "css");
  mountAgentAssetAlias(app, staticRoot, "js");
  mountAgentAssetAlias(app, staticRoot, "img");

  app.get("/favicon.ico", (c) => {
    const r = serveAssetFile(c, staticRoot, "favicon.ico");
    return r ?? c.text("not found", 404);
  });
  app.get("/agent/favicon.ico", (c) => {
    const r = serveAssetFile(c, staticRoot, "favicon.ico");
    return r ?? c.text("not found", 404);
  });

  /** 萌兔总代 SPA 入口 */
  app.get("/agent", (c) => c.redirect("/agent/"));
  app.get("/agent/", (c) => serveAgentIndex(c, agentRoot));

  /** 萌兔 H5 各 hub 页（与官方 wx.wxmtu.com 同构） */
  for (const route of loadSpaRoutes(projectRoot)) {
    if (route === "/agent") continue;
    app.get(route, (c) => serveAgentIndex(c, agentRoot));
  }

  /** 旧版配置表单深链（/agent-src-* 等；Hono 单段路径须用 * 而非 ** 配符） */
  app.get("/agent-src-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/agent-list-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/group-list-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/group-src-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/group-arcade-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/group-display-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/group-resur-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/emoji-copy-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/pay-*", (c) => serveAgentIndex(c, agentRoot));
  app.get("/agent-group-*", (c) => serveAgentIndex(c, agentRoot));
}

function mountAssetDir(app: Hono, staticRoot: string, dir: string): void {
  app.get(`/${dir}/*`, (c) => {
    const rel = `${dir}/${c.req.path.replace(new RegExp(`^/${dir}/?`), "")}`;
    return serveAssetFile(c, staticRoot, rel) ?? c.text("not found", 404);
  });
}

function mountAgentAssetAlias(app: Hono, staticRoot: string, dir: string): void {
  app.get(`/agent/${dir}/*`, (c) => {
    const rel = `${dir}/${c.req.path.replace(new RegExp(`^/agent/${dir}/?`), "")}`;
    return serveAssetFile(c, staticRoot, rel) ?? c.text("not found", 404);
  });
}

function isHtmlBuffer(buf: Buffer): boolean {
  const head = buf.subarray(0, Math.min(buf.length, 256)).toString("utf8").trimStart();
  return head.startsWith("<!DOCTYPE") || head.startsWith("<html");
}

function serveAssetFile(c: Context, root: string, rel: string): Response | null {
  if (!rel || rel.includes("..")) return null;
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  const buf = fs.readFileSync(abs);
  if (isHtmlBuffer(buf)) return null;
  const ext = path.extname(rel);
  return new Response(buf, {
    status: 200,
    headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
  });
}

function mountWechathookAdaptive(app: Hono, adaptiveDir: string): void {
  const files: Array<{ route: string; name: string; type: string }> = [
    { route: "/css/wechathook-adaptive.css", name: "adaptive.css", type: "text/css; charset=utf-8" },
    { route: "/js/wechathook-adaptive.js", name: "adaptive.js", type: "application/javascript; charset=utf-8" },
    { route: "/agent/css/wechathook-adaptive.css", name: "adaptive.css", type: "text/css; charset=utf-8" },
    { route: "/agent/js/wechathook-adaptive.js", name: "adaptive.js", type: "application/javascript; charset=utf-8" },
  ];
  for (const f of files) {
    app.get(f.route, (c) => serveAdaptiveAsset(c, adaptiveDir, f.name, f.type));
  }
}

function serveAdaptiveAsset(c: Context, dir: string, name: string, type: string): Response {
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) return c.text(`${name} missing`, 404);
  return new Response(fs.readFileSync(p), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=60",
    },
  });
}

/** 自适应资源版本（改 adaptive.css/js 时递增） */
const ADAPTIVE_ASSET_VERSION = "7";

function patchAgentIndexHtml(html: string): string {
  const v = ADAPTIVE_ASSET_VERSION;
  const adaptiveHead =
    `<link rel="stylesheet" href="/css/wechathook-adaptive.css?v=${v}">` +
    `<script src="/js/wechathook-adaptive.js?v=${v}" defer></script>`;
  return html
    .replace(/href="css\//g, 'href="/css/')
    .replace(/href="js\//g, 'href="/js/')
    .replace(/src="js\//g, 'src="/js/')
    .replace(/src="static\//g, 'src="/static/')
    .replace(/href="favicon\.ico"/g, 'href="/favicon.ico"')
    .replace(/<title>h5<\/title>/, "<title>wechathook 总代后台</title>")
    .replace(
      /<meta name="viewport"[^>]*>/,
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,viewport-fit=cover">',
    )
    .replace(/<script src="\/static\/config\.js"><\/script>/, `<script src="/static/config.js"></script>${adaptiveHead}`)
    .replace(/<div id="app"><\/div>/, '<div class="mt-adaptive-shell"><div id="app"></div></div>');
}

function serveAgentIndex(c: Context, agentRoot: string): Response {
  const htmlPath = path.join(agentRoot, "index.html");
  if (!fs.existsSync(htmlPath)) {
    return c.text("萌兔 SPA 缺失：reference/mtrobot-agent-portal/static/agent/index.html", 404);
  }
  const html = patchAgentIndexHtml(fs.readFileSync(htmlPath, "utf8"));
  return c.html(html);
}
