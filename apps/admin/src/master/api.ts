import fs from "node:fs";
import path from "node:path";
import type { Hono } from "hono";
import {
  getGroupsDir,
  listGroupConfigRoomIds,
  loadConfig,
  readGroupConfig,
} from "@wechathook/bot-core";
import { PluginConfigLoader } from "@wechathook/plugin-config";
import type { AdminConfig } from "../config.js";
import {
  extractMasterToken,
  masterAuthMiddleware,
  masterLogin,
  masterLogout,
  verifyMasterToken,
} from "./auth.js";
import { MasterStore, listAgentOverrides, listAgents, type AgentPolicy } from "./store.js";

const SEED_MENU = "data/admin-seed/agent-menus-full.json";

function countConfiguredBots(configPath: string, projectRoot: string, groupsDir: string): number {
  const botConfig = loadConfig(configPath, projectRoot);
  const accounts = new Set<string>();
  if (botConfig.bot.botWxid) accounts.add(botConfig.bot.botWxid);
  for (const roomId of listGroupConfigRoomIds(groupsDir)) {
    const gc = readGroupConfig(groupsDir, roomId);
    if (gc?.replyAccount) accounts.add(gc.replyAccount);
  }
  return accounts.size;
}

export function mountMasterApi(app: Hono, config: AdminConfig, projectRoot: string): void {
  const store = new MasterStore(projectRoot, config);
  const groupsDir = getGroupsDir(config.configPath, projectRoot);
  const plugins = new PluginConfigLoader({ projectRoot });
  const auth = masterAuthMiddleware(config);

  app.post("/api/master/login", async (c) => {
    const body = (await c.req.json()) as { username?: string; password?: string };
    const session = masterLogin(config, body.username ?? "", body.password ?? "");
    if (!session) {
      return c.json({ status: 0, message: "账号或密码错误", data: null });
    }
    return c.json({
      status: 1,
      message: "登录成功",
      data: { token: session.token, username: session.username },
    });
  });

  app.post("/api/master/logout", (c) => {
    const token = extractMasterToken({ get: (n) => c.req.header(n) });
    if (token) masterLogout(token);
    return c.json({ status: 1, message: "已退出" });
  });

  app.get("/api/master/session", (c) => {
    const token = extractMasterToken({ get: (n) => c.req.header(n) });
    const session = verifyMasterToken(token);
    if (!session) return c.json({ status: 0, message: "未登录", data: null }, 401);
    return c.json({ status: 1, data: { username: session.username } });
  });

  app.use("/api/master/*", auth);

  app.get("/api/master/dashboard", async (c) => {
    const policy = store.load();
    const agents = listAgents(policy);
    const bot = await fetch(`${config.botServer}/health`).then((r) => r.json()).catch(() => null);
    const roomIds = listGroupConfigRoomIds(groupsDir);
    const overrides = listAgentOverrides(projectRoot);
    const hidden = store.effectiveHiddenRoutes();

    const botServerOk = Boolean((bot as { ok?: boolean })?.ok);
    const botTotalCount = countConfiguredBots(config.configPath, projectRoot, groupsDir);
    const botOnlineCount = botServerOk ? botTotalCount : 0;
    const nowSec = Math.floor(Date.now() / 1000);
    let groupValidCount = 0;
    let groupExpiringSoonCount = 0;
    for (const roomId of roomIds) {
      const gc = readGroupConfig(groupsDir, roomId);
      const exp = gc?.licenseExpires;
      if (exp && exp > nowSec) {
        groupValidCount += 1;
        if (exp - nowSec < 30 * 86400) groupExpiringSoonCount += 1;
      }
    }

    return c.json({
      status: 1,
      data: {
        agentEnabled: agents.some((a) => a.enabled),
        agentLogin: policy.agent.login.username,
        agentServeName: policy.agent.display.serveName,
        botServer: config.botServer,
        botServerOk,
        botTotalCount,
        botOnlineCount,
        groupCount: roomIds.length,
        groupValidCount,
        groupExpiringSoonCount,
        agentCount: agents.length,
        managedGroupCount: roomIds.length,
        pluginOpCount: plugins.listAgentOps().length,
        overrideCount: overrides.length,
        hiddenMenuCount: hidden.size,
        announcement: policy.announcement,
        agentUi: "/agent/",
      },
    });
  });

  app.get("/api/master/resources", async (c) => {
    const policy = store.load();
    const agents = listAgents(policy);
    const primary = agents[0];
    const botConfig = loadConfig(config.configPath, projectRoot);
    const botHealth = await fetch(`${config.botServer}/health`).then((r) => r.json()).catch(() => null);
    const roomIds = listGroupConfigRoomIds(groupsDir);
    const groups = roomIds.map((roomId) => ({
      roomId,
      config: readGroupConfig(groupsDir, roomId),
    }));
    const overrides = listAgentOverrides(projectRoot);
    const hidden = store.effectiveHiddenRoutes();

    return c.json({
      status: 1,
      data: {
        agent: {
          enabled: primary.enabled,
          login: { username: primary.login.username, uid: primary.login.uid },
          display: primary.display,
          announcement: policy.announcement,
          hiddenMenuCount: hidden.size,
          uiUrl: "/agent/",
        },
        agents: agents.map((a) => ({
          enabled: a.enabled,
          login: { username: a.login.username, uid: a.login.uid },
          display: a.display,
        })),
        bot: {
          wxid: botConfig.bot.botWxid,
          commandPrefix: botConfig.bot.commandPrefix,
          transport: botConfig.transport?.mode,
          server: config.botServer,
          serverOk: Boolean((botHealth as { ok?: boolean })?.ok),
        },
        groups,
        overrides,
        stats: {
          groupCount: groups.length,
          pluginOpCount: plugins.listAgentOps().length,
          overrideCount: overrides.length,
        },
      },
    });
  });

  app.get("/api/master/policy", (c) => c.json({ status: 1, data: store.load() }));

  app.put("/api/master/policy", async (c) => {
    const body = (await c.req.json()) as AgentPolicy;
    store.save(body);
    return c.json({ status: 1, message: "策略已保存", data: store.load() });
  });

  app.post("/api/master/agent/toggle", async (c) => {
    const body = (await c.req.json()) as { uid?: number; enabled?: boolean };
    if (body.uid == null || body.enabled == null) {
      return c.json({ status: 0, message: "缺少 uid 或 enabled", data: null });
    }
    try {
      const data = store.setAgentEnabled(body.uid, body.enabled);
      return c.json({ status: 1, message: "总代开关已更新", data });
    } catch {
      return c.json({ status: 0, message: "总代不存在", data: null });
    }
  });

  app.get("/api/master/menu", (c) => {
    const policy = store.load();
    const hidden = store.effectiveHiddenRoutes();
    const file = path.join(projectRoot, SEED_MENU);
    if (!fs.existsSync(file)) return c.json({ status: 1, data: { sections: [] } });

    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
      menu?: Array<{ title?: string; list?: Array<{ title?: string; to?: string; icon?: string }> }>;
    };

    const sections = (raw.menu ?? []).map((sec) => ({
      title: sec.title ?? "",
      items: (sec.list ?? []).map((item) => ({
        title: item.title ?? "",
        route: item.to ?? "",
        icon: item.icon ?? "",
        enabled: !item.to || !hidden.has(item.to),
      })),
    }));

    return c.json({
      status: 1,
      data: { sections, hiddenRoutes: [...hidden], features: policy.agent.features },
    });
  });

  app.put("/api/master/menu", async (c) => {
    const body = (await c.req.json()) as {
      hiddenRoutes?: string[];
      features?: Partial<AgentPolicy["agent"]["features"]>;
    };
    const policy = store.load();
    if (body.hiddenRoutes) policy.agent.menu.hiddenRoutes = body.hiddenRoutes;
    if (body.features) policy.agent.features = { ...policy.agent.features, ...body.features };
    store.save(policy);
    return c.json({ status: 1, message: "菜单策略已更新", data: store.load() });
  });

  app.post("/api/master/menu/toggle", async (c) => {
    const body = (await c.req.json()) as { route: string; enabled: boolean };
    const policy = store.load();
    const set = new Set(policy.agent.menu.hiddenRoutes);
    if (body.enabled) set.delete(body.route);
    else set.add(body.route);
    policy.agent.menu.hiddenRoutes = [...set];
    store.save(policy);
    return c.json({ status: 1, message: "ok" });
  });

  app.get("/api/master/overrides", (c) =>
    c.json({ status: 1, data: listAgentOverrides(projectRoot) }),
  );

  app.get("/api/master/bot", async (c) => {
    const botConfig = loadConfig(config.configPath, projectRoot);
    return c.json({
      status: 1,
      data: {
        botWxid: botConfig.bot.botWxid,
        commandPrefix: botConfig.bot.commandPrefix,
        transport: botConfig.transport?.mode,
      },
    });
  });
}
