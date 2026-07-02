import type { BotPlugin, NormalizedMessage, PluginContext } from "@wechathook/shared";

const plugin: BotPlugin = {
  meta: {
    id: "checkin",
    name: "签到",
    version: "0.1.0",
    commands: ["签到", "排行榜"],
  },

  async onMessage(msg: NormalizedMessage, ctx: PluginContext): Promise<boolean> {
    const prefix = ctx.config.bot.commandPrefix;
    const text = msg.content.trim();

    if (text === `${prefix}签到`) {
      ctx.storage.upsertUser(msg.senderWxid, msg.senderNick);
      const result = ctx.storage.checkin(msg.roomId, msg.senderWxid);

      if (!result.success) {
        await ctx.hook.sendText(msg.roomId, `@${msg.senderNick} 你今天已经签到过了，连续 ${result.streak} 天`);
        return true;
      }

      await ctx.hook.sendText(
        msg.roomId,
        `✅ @${msg.senderNick} 签到成功！\n连续签到：${result.streak} 天\n当前积分：${result.totalPoints}`,
      );
      return true;
    }

    if (text === `${prefix}排行榜`) {
      const board = ctx.storage.getLeaderboard(msg.roomId, 10);
      if (board.length === 0) {
        await ctx.hook.sendText(msg.roomId, "暂无积分数据，发送 #签到 开始赚积分吧！");
        return true;
      }

      const lines = board.map((entry, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        return `${medal} ${entry.nick || entry.wxid} — ${entry.points} 分`;
      });

      await ctx.hook.sendText(msg.roomId, `🏆 积分排行榜\n\n${lines.join("\n")}`);
      return true;
    }

    return false;
  },
};

export default plugin;
