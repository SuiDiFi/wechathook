import type { BotPlugin, NormalizedMessage, PluginContext } from "@wechathook/shared";

const PLUGIN_ID = "game-stub";

const plugin: BotPlugin = {
  meta: {
    id: PLUGIN_ID,
    name: "游戏示例",
    version: "0.1.0",
    commands: ["开始游戏", "结束"],
  },

  async onMessage(msg: NormalizedMessage, ctx: PluginContext): Promise<boolean> {
    const prefix = ctx.config.bot.commandPrefix;
    const text = msg.content.trim();

    if (text === `${prefix}开始游戏`) {
      const existing = ctx.storage.getGameSession(msg.roomId, PLUGIN_ID);
      if (existing) {
        await ctx.hook.sendText(msg.roomId, "🎮 游戏已在进行中，发送 #结束 可结束游戏");
        return true;
      }

      const target = Math.floor(Math.random() * 100) + 1;
      ctx.storage.setGameSession(msg.roomId, PLUGIN_ID, {
        pluginId: PLUGIN_ID,
        roomId: msg.roomId,
        state: "playing",
        data: { target, host: msg.senderWxid, guesses: 0 },
        startedAt: new Date().toISOString(),
      });

      await ctx.hook.sendText(
        msg.roomId,
        `🎮 猜数字游戏开始！\n@${msg.senderNick} 请直接发送 1-100 之间的数字来猜。\n发送 ${prefix}结束 可终止游戏。`,
      );
      return true;
    }

    if (text === `${prefix}结束`) {
      const session = ctx.storage.getGameSession(msg.roomId, PLUGIN_ID);
      if (!session) return false;

      ctx.storage.setGameSession(msg.roomId, PLUGIN_ID, null);
      await ctx.hook.sendText(msg.roomId, "🛑 游戏已结束");
      return true;
    }

    const session = ctx.storage.getGameSession(msg.roomId, PLUGIN_ID);
    if (!session || session.state !== "playing") return false;

    const guess = Number.parseInt(text, 10);
    if (Number.isNaN(guess) || guess < 1 || guess > 100) return false;

    const target = session.data.target as number;
    const guesses = (session.data.guesses as number) + 1;
    session.data.guesses = guesses;
    ctx.storage.setGameSession(msg.roomId, PLUGIN_ID, session);

    if (guess === target) {
      ctx.storage.setGameSession(msg.roomId, PLUGIN_ID, null);
      ctx.storage.addPoints(msg.senderWxid, 20);
      await ctx.hook.sendText(
        msg.roomId,
        `🎉 @${msg.senderNick} 猜对了！答案是 ${target}，用了 ${guesses} 次，获得 20 积分！`,
      );
      return true;
    }

    const hint = guess < target ? "太小了" : "太大了";
    await ctx.hook.sendText(msg.roomId, `@${msg.senderNick} ${hint}，继续猜～`);
    return true;
  },
};

export default plugin;
