import type { BotConfig } from "@wechathook/shared";
import type { ExplisEntry } from "./types.js";

export function getReplyAccount(config: BotConfig, roomId: string): string | undefined {
  return config.groups[roomId]?.replyAccount ?? config.bot.botWxid;
}

export function isGroupLicensed(config: BotConfig, roomId: string, nowSec = Math.floor(Date.now() / 1000)): boolean {
  const expires = config.groups[roomId]?.licenseExpires;
  if (expires === undefined) return false;
  return expires > nowSec;
}

export function buildExplisEntries(
  config: BotConfig,
  groupWxids: string[],
  nowSec = Math.floor(Date.now() / 1000),
): { entries: ExplisEntry[]; authorized: boolean } {
  const entries: ExplisEntry[] = groupWxids.map((group_wxid) => {
    const expires = config.groups[group_wxid]?.licenseExpires;
    const fallback = nowSec + 3600;
    return {
      group_wxid,
      expires: expires && expires > nowSec ? expires : fallback,
    };
  });

  const authorized = groupWxids.some((id) => isGroupLicensed(config, id, nowSec));
  return { entries, authorized };
}
