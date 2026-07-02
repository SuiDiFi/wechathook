import type { PluginConfigLoader } from "@wechathook/plugin-config";
import type { HandleMessageCallback } from "./types.js";

export interface MenuHandleInput {
  roomId: string;
  content: string;
  replyAccount: string;
}

const FALLBACK_MENU = `📋 功能菜单
签到 — 每日签到领金币
查有效期 — 查看群套餐到期
菜单 — 显示本菜单`;

export class MenuEngine {
  constructor(private pluginConfig?: PluginConfigLoader) {}

  tryHandle(input: MenuHandleInput): HandleMessageCallback | null {
    const text = input.content.trim();
    if (text !== "菜单" && text !== "功能" && text !== "功能菜单") return null;

    const content = this.pluginConfig?.resolveMenuText(input.roomId) ?? FALLBACK_MENU;

    return {
      msg_type: 1,
      acc_wxid: input.replyAccount,
      to_wxid: input.roomId,
      wxid: input.roomId,
      content,
    };
  }
}
