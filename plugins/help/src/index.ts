import type { BotPlugin, NormalizedMessage, PluginContext } from "@wechathook/shared";

const plugin: BotPlugin = {
  meta: {
    id: "help",
    name: "帮助",
    version: "0.1.0",
    commands: ["帮助", "help", "指令"],
  },

  async onMessage(msg: NormalizedMessage, ctx: PluginContext): Promise<boolean> {
    const prefix = ctx.config.bot.commandPrefix;
    const text = msg.content.trim();
    const commands = ["帮助", "help", "指令"];
    const matched = commands.some((cmd) => text === `${prefix}${cmd}` || text.startsWith(`${prefix}${cmd} `));
    if (!matched) return false;

    const enabled = ctx.getEnabledPlugins(msg.roomId);
    const lines = [`📖 微信群娱乐机器人 — 指令帮助`, ``, `指令前缀：${prefix}`, ``];

    if (enabled.includes("checkin")) {
      lines.push(`${prefix}签到 — 每日签到赚积分`);
      lines.push(`${prefix}排行榜 — 查看积分排行`);
    }
    if (enabled.includes("game-stub")) {
      lines.push(`${prefix}开始游戏 — 开始示例游戏`);
      lines.push(`${prefix}结束 — 结束当前游戏`);
    }
    if (enabled.includes("admin")) {
      lines.push(`${prefix}踢 <wxid> — 踢出群成员（管理员）`);
    }
    lines.push(`${prefix}帮助 — 显示本帮助`);

    await ctx.hook.sendText(msg.roomId, lines.join("\n"));
    return true;
  },
};

export default plugin;
