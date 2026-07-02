import type { IHookClient, Logger } from "@wechathook/shared";
import { LOGIN_GROUP_LIST_SQL } from "./callback-builders.js";
import type { HandleMessageCallback } from "./types.js";

interface SqlCapableHook extends IHookClient {
  querySql?(db: string, sq: string): Promise<unknown>;
}

function hasQuerySql(hook: IHookClient): hook is SqlCapableHook {
  return typeof (hook as SqlCapableHook).querySql === "function";
}

/**
 * 将萌兔 handleMessagecallback 指令落到 rabbitr / Hook 出站。
 * msg_type 1 → sendText；16 → /r/sqe；19 → 私聊（暂 sendText）；50 → 无操作。
 */
export async function executeCallbacks(
  callbacks: HandleMessageCallback[],
  hook: IHookClient,
  logger: Logger,
): Promise<{ executed: number; errors: number }> {
  let executed = 0;
  let errors = 0;

  for (const cb of callbacks) {
    try {
      switch (cb.msg_type) {
        case 1: {
          const room = cb.to_wxid ?? cb.wxid;
          if (!room || !cb.content) {
            logger.warn(`skip msg_type=1: missing room/content`);
            break;
          }
          await hook.sendText(room, cb.content);
          logger.info(`executed msg_type=1 -> ${room}`);
          executed++;
          break;
        }
        case 16: {
          if (!hasQuerySql(hook)) {
            logger.warn("skip msg_type=16: hook has no querySql");
            break;
          }
          const sqlHook = hook;
          const body = cb.body as { db?: string; sq?: string } | undefined;
          const db = body?.db ?? LOGIN_GROUP_LIST_SQL.db;
          const sq = body?.sq ?? LOGIN_GROUP_LIST_SQL.sq;
          await sqlHook.querySql!(db, sq);
          logger.info(`executed msg_type=16 sql on ${db}`);
          executed++;
          break;
        }
        case 19: {
          const to = cb.to_wxid;
          if (!to) {
            logger.warn("skip msg_type=19: missing to_wxid");
            break;
          }
          if (cb.content) {
            await hook.sendText(to, cb.content);
            logger.info(`executed msg_type=19 -> ${to}`);
            executed++;
          } else {
            logger.debug(`msg_type=19 noop (no content) -> ${to}`);
          }
          break;
        }
        case 50: {
          logger.debug(`msg_type=50 group sync ${cb.group_wxid ?? cb.roomId ?? ""}`);
          executed++;
          break;
        }
        default:
          logger.warn(`unsupported handleMessagecallback msg_type=${cb.msg_type}`);
      }
    } catch (err) {
      errors++;
      logger.error(`callback exec failed msg_type=${cb.msg_type}:`, err);
    }
  }

  return { executed, errors };
}
