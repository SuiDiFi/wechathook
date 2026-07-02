import type { BotConfig } from "@wechathook/shared";
import type { HandleMessageCallback } from "./types.js";

export interface ExpiryHandleInput {
  roomId: string;
  content: string;
  replyAccount: string;
}

export class ExpiryEngine {
  constructor(private config: BotConfig) {}

  tryHandle(input: ExpiryHandleInput): HandleMessageCallback | null {
    const text = input.content.trim();
    if (text !== "查有效期" && text !== "查询有效期") return null;

    const group = this.config.groups[input.roomId];
    const expires = group?.licenseExpires;
    const expiresStr = expires
      ? new Date(expires * 1000).toLocaleString("zh-CN", { hour12: false })
      : "未配置";

    const content = `✨【群ID：${input.roomId.replace("@chatroom", "")}】
✨套餐类型:月卡
✨群有效期至:${expiresStr}
✨版本说明:30天有效期
✨可发送“菜单”查询对应功能。`;

    return {
      msg_type: 1,
      acc_wxid: input.replyAccount,
      to_wxid: input.roomId,
      wxid: input.roomId,
      content,
    };
  }
}
