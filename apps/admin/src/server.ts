import { Hono } from "hono";
import {
  getGroupsDir,
  listGroupConfigRoomIds,
  loadConfig,
  readGroupConfig,
  saveGroupConfig,
} from "@wechathook/bot-core";
import { PluginConfigLoader } from "@wechathook/plugin-config";
import type { GroupConfig } from "@wechathook/shared";
import { createLogger } from "./config.js";
import type { AdminConfig } from "./config.js";
import { DEFAULT_AGENT_USERNAME } from "./agent-defaults.js";
import { registerMengtuApiFallback, registerMengtuLocalApiRoutes } from "./mengtu-api.js";
import { mountMengtuAgentUi } from "./mengtu-ui.js";
import { mountConsoleUi } from "./console-ui.js";
import { mountMasterApi } from "./master/api.js";

function internalAuthMiddleware(config: AdminConfig) {
  return async (
    c: { req: { header: (n: string) => string | undefined }; json: (b: unknown, s?: number) => Response },
    next: () => Promise<void>,
  ) => {
    if (!config.auth.token) return next();
    const auth = c.req.header("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : c.req.header("x-admin-token") ?? "";
    if (token !== config.auth.token) {
      return c.json({ status: -1, message: "请先登录" }, 401);
    }
    await next();
  };
}

export function createAdminApp(config: AdminConfig, projectRoot: string): Hono {
  const app = new Hono();
  const logger = createLogger("admin");
  const pluginConfig = new PluginConfigLoader({ projectRoot });
  const groupsDir = getGroupsDir(config.configPath, projectRoot);

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "wechathook-admin",
      botServer: config.botServer,
      ui: "master-console+agent",
    }),
  );

  /** 官方总控 /console + 总控 API；总代 /agent 由萌兔 SPA 提供 */
  mountConsoleUi(app, config, projectRoot);
  mountMasterApi(app, config, projectRoot);

  /** wechathook 内部管理 API（须在萌兔 POST 兜底之前注册） */
  app.use("/api/status", internalAuthMiddleware(config));
  app.use("/api/groups", internalAuthMiddleware(config));
  app.use("/api/groups/*", internalAuthMiddleware(config));
  app.use("/api/proxy/*", internalAuthMiddleware(config));

  app.get("/api/status", async (c) => {
    const botHealth = await fetch(`${config.botServer}/health`).then((r) => r.json()).catch(() => null);
    return c.json({
      status: 1,
      data: {
        admin: true,
        botServer: config.botServer,
        botServerOk: Boolean((botHealth as { ok?: boolean })?.ok),
        groupCount: listGroupConfigRoomIds(groupsDir).length,
        agentOpCount: pluginConfig.listAgentOps().length,
      },
    });
  });

  app.get("/api/groups", (c) => {
    const ids = listGroupConfigRoomIds(groupsDir);
    const botConfig = loadConfig(config.configPath, projectRoot);
    const items = ids.map((roomId) => ({
      roomId,
      config: readGroupConfig(groupsDir, roomId),
      licensed: Boolean(botConfig.groups[roomId]?.licenseExpires),
    }));
    return c.json({ status: 1, data: items });
  });

  app.get("/api/groups/:roomId", (c) => {
    const roomId = c.req.param("roomId");
    const group = readGroupConfig(groupsDir, roomId);
    if (!group) return c.json({ status: 0, message: "not found" }, 404);
    return c.json({ status: 1, data: { roomId, ...group } });
  });

  app.put("/api/groups/:roomId", async (c) => {
    const roomId = c.req.param("roomId");
    const body = (await c.req.json()) as GroupConfig;
    const file = saveGroupConfig(groupsDir, roomId, body);
    logger.info(`saved group config ${roomId} -> ${file}`);
    return c.json({ status: 1, msg: "suc", data: { roomId, file } });
  });

  app.post("/api/proxy/super/explis", async (c) => {
    const body = await c.req.json();
    const res = await fetch(`${config.botServer}/super/msg/explis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return c.json(await res.json());
  });

  /** 萌兔总代 H5 + 核心 API（login/srcGet/srcPost） */
  mountMengtuAgentUi(app, config, projectRoot);

  /** 自建版本地数据（菜单/账号/群/激活码；屏蔽云槽位样例） */
  registerMengtuLocalApiRoutes(app, config, projectRoot);

  /** 萌兔 API 样例兜底（脱敏后） */
  registerMengtuApiFallback(app, projectRoot);

  app.get("/", (c) => c.redirect("/console/"));

  return app;
}

export async function startAdminServer(
  config: AdminConfig,
  projectRoot: string,
): Promise<void> {
  const logger = createLogger("admin");
  const { serve } = await import("@hono/node-server");
  const app = createAdminApp(config, projectRoot);

  serve(
    { fetch: app.fetch, hostname: config.listen.host, port: config.listen.port },
    () => {
      logger.info(`Admin listening http://${config.listen.host}:${config.listen.port}`);
      logger.info(`官方总控: http://${config.listen.host}:${config.listen.port}/console/`);
      logger.info(`萌兔总代 UI: http://${config.listen.host}:${config.listen.port}/agent/`);
      logger.info(`Bot-server upstream: ${config.botServer}`);
      logger.info(`Login: ${config.login?.username ?? DEFAULT_AGENT_USERNAME} / ${config.login?.password ? "****" : "(空密码)"}`);
    },
  );
}
