import { Hono } from "hono";
import type { BotConfig, Logger } from "@wechathook/shared";
import type { PluginRegistry } from "./plugin-registry.js";
import type { IStorage } from "@wechathook/shared";
import { CallbackHookClient } from "./super/callback-hook-client.js";
import { buildExplisEntries, getReplyAccount, isGroupLicensed } from "./super/group-license.js";
import { isGroupTextMessage, normalizeMengtuGroupMessage, parseMengtuMsg } from "./super/normalize.js";
import { SignEngine } from "./super/sign-engine.js";
import { MenuEngine } from "./super/menu-engine.js";
import { ExpiryEngine } from "./super/expiry-engine.js";
import type { PluginConfigLoader } from "@wechathook/plugin-config";
import type { HandleMessageCallback, SuperApiResponse, SuperCallbackParams } from "./super/types.js";

export interface SuperServerOptions {
  config: BotConfig;
  registry: PluginRegistry;
  storage: IStorage;
  logger: Logger;
  port: number;
  pluginConfig?: PluginConfigLoader;
}

export function createSuperApp(options: SuperServerOptions): Hono {
  const { config, registry, storage, logger, port, pluginConfig } = options;
  const app = new Hono();
  const signEngine = new SignEngine(config, storage, pluginConfig);
  const menuEngine = new MenuEngine(pluginConfig);
  const expiryEngine = new ExpiryEngine(config);
  const callbackHook = new CallbackHookClient("", "");

  const parseBody = async (c: { req: { json: () => Promise<unknown> } }) => {
    return (await c.req.json()) as SuperCallbackParams;
  };

  app.get("/health", (c) =>
    c.json({ ok: true, service: "wechathook-bot-server", port }),
  );

  /** 调试：查看某群当前生效的签到配置（含 agent-overrides） */
  app.get("/super/debug/sign", (c) => {
    const roomId = c.req.query("roomId") ?? "";
    if (!roomId || !pluginConfig) {
      return c.json({ status: 0, msg: "missing roomId or pluginConfig", data: null });
    }
    return c.json({ status: 1, msg: "suc", data: pluginConfig.describeSign(roomId) });
  });

  /** 调试：查看某群当前生效的菜单配置（含 agent-overrides） */
  app.get("/super/debug/menu", (c) => {
    const roomId = c.req.query("roomId") ?? "";
    if (!roomId || !pluginConfig) {
      return c.json({ status: 0, msg: "missing roomId or pluginConfig", data: null });
    }
    return c.json({ status: 1, msg: "suc", data: pluginConfig.describeMenu(roomId) });
  });

  /** 对齐萌兔 POST /super/msg/callback */
  app.post("/super/msg/callback", async (c) => {
    const params = await parseBody(c);
    const msg = parseMengtuMsg(params.msg);
    const accWxid = msg?.acc_wxid ?? msg?.account_wxid ?? params.acc_wxid ?? "";

    if (!msg) {
      return c.json({ status: 1, msg: "suc", data: [] } satisfies SuperApiResponse<HandleMessageCallback[]>);
    }

    const callbacks: HandleMessageCallback[] = [];

    if (isGroupTextMessage(msg)) {
      const normalized = normalizeMengtuGroupMessage(msg);
      if (normalized) {
        const replyAccount = getReplyAccount(config, normalized.roomId);
        const licensed = isGroupLicensed(config, normalized.roomId);

        if (replyAccount && licensed && accWxid === replyAccount) {
          const signReply = signEngine.tryHandle({
            roomId: normalized.roomId,
            senderWxid: normalized.senderWxid,
            senderNick: normalized.senderNick,
            content: normalized.content,
            replyAccount,
          });
          if (signReply) {
            callbacks.push(signReply);
          } else {
            const menuReply = menuEngine.tryHandle({
              roomId: normalized.roomId,
              content: normalized.content,
              replyAccount,
            });
            if (menuReply) {
              callbacks.push(menuReply);
            } else {
            const expiryReply = expiryEngine.tryHandle({
              roomId: normalized.roomId,
              content: normalized.content,
              replyAccount,
            });
            if (expiryReply) {
              callbacks.push(expiryReply);
            } else {
            callbackHook.reset(replyAccount, normalized.roomId);
            const ctx = registry.getContext();
            const prevHook = ctx.hook;
            Object.assign(ctx, { hook: callbackHook });

            try {
              const prefixed = {
                ...normalized,
                content: `${config.bot.commandPrefix}${normalized.content}`,
              };
              await registry.dispatchMessage(prefixed);
              callbacks.push(...callbackHook.callbacks);
            } finally {
              Object.assign(ctx, { hook: prevHook });
            }
            }
            }
          }
        }
      }
    }

    if (callbacks.length > 0) {
      for (const cb of callbacks) {
        logger.info(`handleMessagecallback ${JSON.stringify(cb)}`);
      }
    }

    return c.json({
      status: 1,
      msg: "suc",
      data: callbacks,
    } satisfies SuperApiResponse<HandleMessageCallback[]>);
  });

  /** 对齐萌兔 POST /super/msg/explis */
  app.post("/super/msg/explis", async (c) => {
    const params = await parseBody(c);
    const raw = params.group_wxid ?? "";
    const groupWxids = raw
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    const { entries, authorized } = buildExplisEntries(config, groupWxids);
    const response = {
      status: authorized ? 1 : 0,
      msg: authorized ? "suc" : "not dat",
      data: entries,
    };
    logger.debug(`explis groups=${groupWxids.length} authorized=${authorized}`);
    return c.json(response);
  });

  /** 对齐萌兔 POST /super/msg/lis 在线心跳 */
  app.post("/super/msg/lis", async (c) => {
    const params = await parseBody(c);
    logger.debug(`lis wxid=${params.wxid ?? (params as Record<string, string>).wxid}`);
    return c.json({ status: 1, msg: "suc" } satisfies SuperApiResponse);
  });

  /** 对齐萌兔 POST /super/msg/scu 配置同步 */
  app.post("/super/msg/scu", async (c) => {
    await parseBody(c);
    return c.json({ status: 1, msg: "suc", data: null } satisfies SuperApiResponse);
  });

  return app;
}

export async function startSuperServer(app: Hono, port: number, logger: Logger): Promise<void> {
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port }, () => {
    logger.info(`Bot server listening on http://127.0.0.1:${port}`);
    logger.info("Super API endpoints:");
    logger.info("  POST /super/msg/callback");
    logger.info("  POST /super/msg/explis");
    logger.info("  POST /super/msg/lis");
    logger.info("  POST /super/msg/scu");
    logger.info("  GET  /health");
  });
}
