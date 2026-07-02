import fs from "node:fs";
import path from "node:path";
import { LOCAL_API_PATHS } from "./page-registry.js";
import { resolveEmptyApi } from "./providers/empty-api.js";

/** API 兜底：空结构响应，不使用萌兔官方代理后台业务数据 */
export class ApiFallbackResolver {
  private codesProducts: unknown[] = [];

  constructor(projectRoot: string) {
    const file = path.join(projectRoot, "data/admin-seed/codes-products.json");
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { product?: unknown[] };
      this.codesProducts = raw.product ?? [];
    }
  }

  resolvePost(pathname: string): unknown {
    const apiPath = pathname.replace(/^\/api/, "") || "/";
    if (LOCAL_API_PATHS.has(apiPath)) {
      return { status: 0, message: "请使用本地 API 处理器", data: null };
    }
    return resolveEmptyApi(apiPath, { codesProducts: this.codesProducts });
  }
}

export function loadSpaRoutes(projectRoot: string): string[] {
  const file = path.join(projectRoot, "reference/mtrobot-agent-portal/routes.txt");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l !== "*" && l !== "/" && !l.includes(":"));
}

export function listAgentSrcOps(projectRoot: string): string[] {
  const file = path.join(projectRoot, "data/admin-seed/agent-menus-full.json");
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    menu?: Array<{ list?: Array<{ to?: string }> }>;
  };
  const ops = new Set<string>();
  for (const section of raw.menu ?? []) {
    for (const item of section.list ?? []) {
      const m = item.to?.match(/^\/agent-src-(.+)$/);
      if (m) ops.add(m[1]);
      const listM = item.to?.match(/^\/agent-list-(.+)$/);
      if (listM) ops.add(listM[1]);
    }
  }
  return [...ops];
}

/** 从完整菜单生成总控页面分区（仅路由/标题，无业务数据） */
export function buildConsoleSectionsFromMenus(projectRoot: string): Array<{
  id: string;
  title: string;
  pages: Array<{ route: string; title: string; tier: string }>;
}> {
  const file = path.join(projectRoot, "data/admin-seed/agent-menus-full.json");
  if (!fs.existsSync(file)) return [];

  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
    menu?: Array<{ title?: string; list?: Array<{ title?: string; to?: string }> }>;
  };

  const staticRoutes = loadSpaRoutes(projectRoot);
  const fromMenu = new Set<string>();
  const sections = (raw.menu ?? []).map((sec, i) => ({
    id: `menu-${i}`,
    title: sec.title ?? "配置",
    pages: (sec.list ?? [])
      .filter((item) => item.to?.startsWith("/"))
      .map((item) => {
        fromMenu.add(item.to!);
        return { route: item.to!, title: item.title ?? item.to!, tier: "preview" };
      }),
  }));

  const extra = staticRoutes
    .filter((r) => !fromMenu.has(r) && r !== "/agent")
    .map((r) => ({ route: r, title: r.replace(/^\//, ""), tier: "preview" }));

  if (extra.length > 0) {
    sections.push({ id: "routes-extra", title: "其他页面", pages: extra });
  }

  sections.unshift({
    id: "entry",
    title: "总代入口",
    pages: [
      { route: "/agent/", title: "总代登录", tier: "live" },
      { route: "/agent-center", title: "代理中心首页", tier: "live" },
    ],
  });

  return sections;
}
