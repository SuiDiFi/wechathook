import { Hono } from "hono";

import {
  normalizeGroupMessage,
  normalizeMemberJoin,
  normalizeMemberLeave,
  normalizeMengtuInjectGroupMessage,
  normalizeMengtuInjectMemberJoin,
  normalizeMengtuInjectMemberLeave,
  routeHookCallbackSync,
} from "@wechathook/hook-adapter";
import type { BotConfig, IHookClient } from "@wechathook/shared";
import { resolveTransportMode } from "@wechathook/transport";

import { createLogger } from "./config.js";
import { BotServerRelay } from "./super/bot-server-relay.js";

import type { PluginRegistry } from "./plugin-registry.js";



const HOOK_SUCCESS = { code: 1, msg: "success" };



export function createWebhookApp(
  config: BotConfig,
  registry: PluginRegistry,
  hook?: IHookClient,
): Hono {
  const app = new Hono();
  const logger = createLogger("webhook");
  const transportMode = resolveTransportMode(config);
  const botRelay = hook ? new BotServerRelay(config, hook, logger) : null;

  if (botRelay?.enabled) {
    logger.info(`Bot-server relay ON -> ${botRelay.url}`);
  }

  const pickGroupMessage = (raw: unknown) => {
    if (transportMode === "rabbitr41955") {
      return normalizeMengtuInjectGroupMessage(raw) ?? normalizeGroupMessage(raw);
    }
    return normalizeGroupMessage(raw) ?? normalizeMengtuInjectGroupMessage(raw);
  };

  const pickMemberJoin = (raw: unknown) => {
    if (transportMode === "rabbitr41955") {
      return normalizeMengtuInjectMemberJoin(raw) ?? normalizeMemberJoin(raw);
    }
    return normalizeMemberJoin(raw) ?? normalizeMengtuInjectMemberJoin(raw);
  };

  const pickMemberLeave = (raw: unknown) => {
    if (transportMode === "rabbitr41955") {
      return normalizeMengtuInjectMemberLeave(raw) ?? normalizeMemberLeave(raw);
    }
    return normalizeMemberLeave(raw) ?? normalizeMengtuInjectMemberLeave(raw);
  };



  const verifySecret = (secret: string | undefined): boolean => {

    if (!config.hook.webhookSecret) return true;

    return secret === config.hook.webhookSecret;

  };



  app.get("/health", (c) => c.json({ ok: true, service: "wechathook-gateway" }));



  /** Hook 4.1.8.27 统一回调入口（与 C# VXHook demo 的 /api/recvMsg 一致） */

  const handleRecvMsg = async (c: {

    req: { header: (name: string) => string | undefined; json: () => Promise<unknown> };

    json: (body: unknown, status?: number) => Response;

  }) => {

    if (!verifySecret(c.req.header("x-webhook-secret"))) {

      return c.json({ error: "unauthorized" }, 401);

    }



    const raw = await c.req.json();

    const routed = routeHookCallbackSync(raw, {
      normalizeGroupMessage: pickGroupMessage,
      normalizeMemberJoin: pickMemberJoin,
      normalizeMemberLeave: pickMemberLeave,
    });



    try {

      switch (routed.kind) {

        case "group_message":

          if (routed.message) {

            logger.info(

              `Group message [${routed.message.roomId}] ${routed.message.senderNick}: ${routed.message.content.slice(0, 80)}`,

            );

            if (botRelay?.enabled) {
              const relayResult = await botRelay.handleInjectRaw(raw);
              if (process.env.DEBUG_RELAY && relayResult) {
                return c.json({
                  ...HOOK_SUCCESS,
                  relay: {
                    callbacks: relayResult.callbacks.length,
                    executed: relayResult.executed,
                    errors: relayResult.errors,
                  },
                });
              }
            } else {
              await registry.dispatchMessage(routed.message);
            }

          }

          break;

        case "member_join":

          if (routed.memberJoin) {

            logger.info(`Member join [${routed.memberJoin.roomId}] ${routed.memberJoin.memberNick}`);

            await registry.dispatchMemberJoin(routed.memberJoin);

          }

          break;

        case "member_leave":

          if (routed.memberLeave) {

            logger.info(`Member leave [${routed.memberLeave.roomId}] ${routed.memberLeave.memberNick}`);

            await registry.dispatchMemberLeave(routed.memberLeave);

          }

          break;

        default:

          logger.debug(`Ignored callback kind: ${routed.kind}`);

      }

    } catch (err) {

      logger.error("recvMsg dispatch failed:", err);

      return c.json({ ok: false, error: String(err) }, 500);

    }



    return c.json(HOOK_SUCCESS);

  };



  app.post("/api/recvMsg", handleRecvMsg);

  app.post("/api/recvMsg/", handleRecvMsg);



  const handleGroupMessage = async (c: {

    req: { header: (name: string) => string | undefined; json: () => Promise<unknown> };

    json: (body: unknown, status?: number) => Response;

  }) => {

    if (!verifySecret(c.req.header("x-webhook-secret"))) {

      return c.json({ error: "unauthorized" }, 401);

    }



    const raw = await c.req.json();

    const msg = pickGroupMessage(raw);

    if (!msg) {

      logger.debug("Ignored non-group message payload");

      return c.json({ ok: true, ignored: true });

    }



    logger.info(`Group message [${msg.roomId}] ${msg.senderNick}: ${msg.content.slice(0, 80)}`);



    try {

      await registry.dispatchMessage(msg);

    } catch (err) {

      logger.error("dispatchMessage failed:", err);

      return c.json({ ok: false, error: String(err) }, 500);

    }



    return c.json({ ok: true });

  };



  app.post("/hook/group-message", handleGroupMessage);

  app.put("/hook/group-message", handleGroupMessage);



  app.post("/hook/member-join", async (c) => {

    if (!verifySecret(c.req.header("x-webhook-secret"))) {

      return c.json({ error: "unauthorized" }, 401);

    }



    const raw = await c.req.json();

    const event = pickMemberJoin(raw);

    if (!event) return c.json({ ok: true, ignored: true });



    logger.info(`Member join [${event.roomId}] ${event.memberNick}`);



    try {

      await registry.dispatchMemberJoin(event);

    } catch (err) {

      logger.error("dispatchMemberJoin failed:", err);

      return c.json({ ok: false, error: String(err) }, 500);

    }



    return c.json({ ok: true });

  });



  app.post("/hook/member-leave", async (c) => {

    if (!verifySecret(c.req.header("x-webhook-secret"))) {

      return c.json({ error: "unauthorized" }, 401);

    }



    const raw = await c.req.json();

    const event = pickMemberLeave(raw);

    if (!event) return c.json({ ok: true, ignored: true });



    logger.info(`Member leave [${event.roomId}] ${event.memberNick}`);



    try {

      await registry.dispatchMemberLeave(event);

    } catch (err) {

      logger.error("dispatchMemberLeave failed:", err);

      return c.json({ ok: false, error: String(err) }, 500);

    }



    return c.json({ ok: true });

  });



  return app;

}



export async function startServer(app: Hono, port: number): Promise<void> {

  const logger = createLogger("gateway");

  const { serve } = await import("@hono/node-server");



  serve({ fetch: app.fetch, port }, () => {

    logger.info(`Webhook gateway listening on http://127.0.0.1:${port}`);

    logger.info(`Endpoints:`);

    logger.info(`  POST /api/recvMsg       (Hook 4.1.8.27 统一回调)`);

    logger.info(`  POST /hook/group-message`);

    logger.info(`  POST /hook/member-join`);

    logger.info(`  POST /hook/member-leave`);

    logger.info(`  GET  /health`);

  });

}


