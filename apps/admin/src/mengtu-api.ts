import fs from "node:fs";
import path from "node:path";
import { AGENT_OVERRIDES_DIR } from "@wechathook/plugin-config";
import type { AdminConfig } from "./config.js";
import { ApiFallbackResolver } from "./mengtu-samples.js";
import {
  buildAgentIndex,
  buildAgentMenus,
  buildCodesGetList,
  buildGroupList,
  buildGroupUnusedList,
  buildHelpIndex,
  buildLoginIsLogin,
  buildMemberIndex,
  buildSettingIndex,
} from "./providers/local-api.js";
import { providerCtx } from "./providers/types.js";
import { getMasterStore } from "./master/store.js";

export interface MengtuSession {
  uid: number;
  username: string;
  token: string;
}

const sessions = new Map<string, MengtuSession>();

const AGENT_SRC = "reference/mtrobot-agent-portal/api-samples/full-sync/Agent/srcGet";

type RouteApp = {
  post: (p: string, h: (c: MengtuCtx) => Response | Promise<Response>) => void;
};

type MengtuCtx = {
  req: { json: () => Promise<unknown>; path: string };
  json: (body: unknown, status?: number) => Response;
};

export function registerMengtuApiRoutes(
  app: RouteApp,
  config: AdminConfig,
  projectRoot: string,
): void {
  const agentSrcDir = path.join(projectRoot, AGENT_SRC);
  const overrideDir = path.join(projectRoot, AGENT_OVERRIDES_DIR);

  app.post("/api/Agent/login", async (c) => {
    const body = (await c.req.json()) as { username?: string; password?: string };
    const store = getMasterStore(projectRoot, config);
    const matched = store.findAgentByUsername(body.username ?? "");
    if (!matched) {
      return c.json({ status: 0, message: "账号或密码错误", data: null });
    }
    if (!matched.enabled) {
      return c.json({ status: 0, message: "总代后台已由总控关闭", data: null });
    }
    const pass = matched.login.password;
    if (pass && body.password !== pass) {
      return c.json({ status: 0, message: "账号或密码错误", data: null });
    }
    const user = matched.login.username;
    const token = `mt-${Date.now().toString(36)}`;
    sessions.set(token, { uid: matched.login.uid, username: user, token });
    return c.json({
      status: 1,
      message: "登录成功",
      data: { uid: matched.login.uid, is_agent: 1, token },
    });
  });

  app.post("/api/Agent/srcGet", async (c) => {
    const body = (await c.req.json()) as { op?: string };
    const op = body.op ?? "";
    const base = loadSrcGet(agentSrcDir, overrideDir, op);
    if (!base) {
      return c.json({ status: 0, message: "失败", data: [] });
    }
    return c.json(base);
  });

  app.post("/api/Agent/srcPost", async (c) => {
    const body = await c.req.json();
    const op = (body as { op?: string }).op ?? "";
    if (!op) return c.json({ status: 0, message: "缺少 op" });
    const form = parseSrcPostForm(body);
    fs.mkdirSync(overrideDir, { recursive: true });
    fs.writeFileSync(
      path.join(overrideDir, `${op}.json`),
      JSON.stringify(form, null, 2),
      "utf8",
    );
    return c.json({ status: 1, message: "成功", data: null });
  });
}

/** 本机数据 API（菜单/账号/群/激活码模板），不含萌兔官方业务数据 */
export function registerMengtuLocalApiRoutes(
  app: RouteApp,
  config: AdminConfig,
  projectRoot: string,
): void {
  app.post("/api/Agent/menus", (c) => c.json(buildAgentMenus(providerCtx(projectRoot, config))));
  app.post("/api/Agent/index", (c) => c.json(buildAgentIndex(providerCtx(projectRoot, config))));
  app.post("/api/Member/menu", (c) => c.json(buildAgentMenus(providerCtx(projectRoot, config))));
  app.post("/api/Member/index", (c) => c.json(buildMemberIndex(providerCtx(projectRoot, config))));
  app.post("/api/Setting/index", (c) => c.json(buildSettingIndex(providerCtx(projectRoot, config))));
  app.post("/api/Login/isLogin", (c) => c.json(buildLoginIsLogin(providerCtx(projectRoot, config))));
  app.post("/api/Help/index", (c) => c.json(buildHelpIndex(providerCtx(projectRoot, config))));
  app.post("/api/Help/notice", (c) => c.json(buildHelpIndex(providerCtx(projectRoot, config))));
  app.post("/api/Codes/getList", (c) => c.json(buildCodesGetList(providerCtx(projectRoot, config))));
  app.post("/api/Group/get", (c) => c.json(buildGroupList(providerCtx(projectRoot, config))));
  app.post("/api/Group/getUnusedList", (c) => c.json(buildGroupUnusedList(providerCtx(projectRoot, config))));
  app.post("/api/Group/selectGroup", (c) => c.json(buildGroupList(providerCtx(projectRoot, config))));
}

/** 空结构兜底（须在所有 /api/* 之后） */
export function registerMengtuApiFallback(app: RouteApp, projectRoot: string): void {
  const resolver = new ApiFallbackResolver(projectRoot);
  app.post("/api/*", async (c) => c.json(resolver.resolvePost(c.req.path)));
}

/** 萌兔 SPA 可能传 form 对象，或 data 为 JSON 字符串 */
function parseSrcPostForm(body: unknown): Record<string, unknown> {
  const b = body as Record<string, unknown>;
  if (b.form && typeof b.form === "object" && !Array.isArray(b.form)) {
    return b.form as Record<string, unknown>;
  }
  if (typeof b.data === "string") {
    try {
      return JSON.parse(b.data) as Record<string, unknown>;
    } catch {
      /* fallthrough */
    }
  }
  if (b.data && typeof b.data === "object" && !Array.isArray(b.data)) {
    return b.data as Record<string, unknown>;
  }
  const { op: _op, status: _s, message: _m, token: _t, ...rest } = b;
  return rest;
}

function loadSrcGet(agentSrcDir: string, overrideDir: string, op: string): unknown | null {
  const file = path.join(agentSrcDir, `${op}.json`);
  if (!fs.existsSync(file)) return null;
  const base = JSON.parse(fs.readFileSync(file, "utf8")) as {
    status: number;
    data?: { form?: Array<{ name?: string; value?: unknown }> };
  };
  const overrideFile = path.join(overrideDir, `${op}.json`);
  if (!fs.existsSync(overrideFile) || !base.data?.form) return base;

  const overrides = JSON.parse(fs.readFileSync(overrideFile, "utf8")) as Record<string, unknown>;
  for (const field of base.data.form) {
    if (field.name && overrides[field.name] !== undefined) {
      field.value = overrides[field.name];
    }
  }
  return base;
}

export function getMengtuStaticRoot(projectRoot: string): string {
  return path.join(projectRoot, "reference/mtrobot-agent-portal/static");
}

export function getMengtuAgentStaticRoot(projectRoot: string): string {
  return path.join(getMengtuStaticRoot(projectRoot), "agent");
}
