import type { BotConfig, IStorage, SignGroupConfig } from "@wechathook/shared";
import type { PluginConfigLoader } from "@wechathook/plugin-config";
import type { HandleMessageCallback } from "./types.js";

const DEFAULT_SIGN: Required<
  Pick<SignGroupConfig, "keyword" | "messageTemplate" | "minCoins" | "maxCoins" | "minDiamonds" | "maxDiamonds">
> = {
  keyword: "签到",
  messageTemplate:
    "@[昵称] 签到成功！[换行]—————————————[换行]✨奖励金币:[金币]个[换行]✨奖励钻石:[钻石]个[换行]✨连续签到:[连续]天[换行]—————————————[换行]天天签到的人最有爱了😝",
  minCoins: 100,
  maxCoins: 9990,
  minDiamonds: 0,
  maxDiamonds: 0,
};

function randomInt(min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`[${key}]`).join(String(value));
  }
  out = out.replace(/\[换行\]/g, "\n");
  out = out.replace(/\[@emoji=([0-9A-Fa-f]+)\]/g, (_, hex: string) => {
    try {
      return String.fromCodePoint(Number.parseInt(hex, 16));
    } catch {
      return "";
    }
  });
  return out;
}

export interface SignHandleInput {
  roomId: string;
  senderWxid: string;
  senderNick: string;
  content: string;
  replyAccount: string;
}

export class SignEngine {
  constructor(
    private config: BotConfig,
    private storage: IStorage,
    private pluginConfig?: PluginConfigLoader,
  ) {}

  private resolveSignCfg(roomId: string): Required<
    Pick<SignGroupConfig, "keyword" | "messageTemplate" | "minCoins" | "maxCoins" | "minDiamonds" | "maxDiamonds">
  > & { enabled: boolean } {
    const fromOp = this.pluginConfig?.resolveSignConfig(roomId);
    const yamlGroup = this.config.groups[roomId]?.sign;

    if (fromOp?.enabled === false) return { ...DEFAULT_SIGN, enabled: false };

    if (fromOp?.enabled === true) {
      return {
        enabled: true,
        keyword: fromOp.keyword ?? DEFAULT_SIGN.keyword,
        messageTemplate: fromOp.messageTemplate || DEFAULT_SIGN.messageTemplate,
        minCoins: fromOp.minCoins ?? DEFAULT_SIGN.minCoins,
        maxCoins: fromOp.maxCoins ?? DEFAULT_SIGN.maxCoins,
        minDiamonds: fromOp.minDiamonds ?? DEFAULT_SIGN.minDiamonds,
        maxDiamonds: fromOp.maxDiamonds ?? DEFAULT_SIGN.maxDiamonds,
      };
    }

    if (yamlGroup?.enabled === false) return { ...DEFAULT_SIGN, enabled: false };
    return {
      enabled: true,
      keyword: yamlGroup?.keyword ?? DEFAULT_SIGN.keyword,
      messageTemplate: yamlGroup?.messageTemplate || DEFAULT_SIGN.messageTemplate,
      minCoins: yamlGroup?.minCoins ?? DEFAULT_SIGN.minCoins,
      maxCoins: yamlGroup?.maxCoins ?? DEFAULT_SIGN.maxCoins,
      minDiamonds: yamlGroup?.minDiamonds ?? DEFAULT_SIGN.minDiamonds,
      maxDiamonds: yamlGroup?.maxDiamonds ?? DEFAULT_SIGN.maxDiamonds,
    };
  }

  tryHandle(input: SignHandleInput): HandleMessageCallback | null {
    const signCfg = this.resolveSignCfg(input.roomId);
    if (!signCfg.enabled) return null;

    const text = input.content.trim();
    if (text !== signCfg.keyword) return null;

    this.storage.upsertUser(input.senderWxid, input.senderNick);
    const result = this.storage.checkin(input.roomId, input.senderWxid);

    if (!result.success) {
      return {
        msg_type: 1,
        acc_wxid: input.replyAccount,
        to_wxid: input.roomId,
        wxid: input.roomId,
        content: `@${input.senderNick} 你今天已经签到过了，连续 ${result.streak} 天`,
      };
    }

    const coins = randomInt(signCfg.minCoins, signCfg.maxCoins);
    const diamonds = randomInt(signCfg.minDiamonds, signCfg.maxDiamonds);
    this.storage.addPoints(input.senderWxid, coins);

    const content = renderTemplate(signCfg.messageTemplate, {
      昵称: input.senderNick,
      微信号: input.senderWxid,
      金币: coins,
      总金币: this.storage.getPoints(input.senderWxid),
      钻石: diamonds,
      总钻石: 0,
      连续: result.streak,
      总次: result.streak,
      身份: "成员",
      本月: 1,
      日期: new Date().toLocaleDateString("zh-CN"),
      时间: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      排名: 1,
      一言: "",
      正能量: "",
      情话: "",
      毒鸡汤: "",
      舔狗日记: "",
      cpdd: "",
      土味情话: "",
      绿茶语录: "",
      头衔: "",
      签到人wxid: input.senderWxid,
    });

    return {
      msg_type: 1,
      acc_wxid: input.replyAccount,
      to_wxid: input.roomId,
      wxid: input.roomId,
      content,
    };
  }
}
