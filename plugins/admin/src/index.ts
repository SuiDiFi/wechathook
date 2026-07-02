import type { BotPlugin, NormalizedMessage, PluginContext } from "@wechathook/shared";

const plugin: BotPlugin = {
  meta: {
    id: "admin",
    name: "群管理",
    version: "0.1.0",
    commands: ["踢"],
  },

  async onMessage(msg: NormalizedMessage, ctx: PluginContext): Promise<boolean> {
    const prefix = ctx.config.bot.commandPrefix;
    const text = msg.content.trim();

    if (!text.startsWith(`${prefix}踢`)) return false;

    if (!ctx.isAdmin(msg.roomId, msg.senderWxid)) {
      await ctx.hook.sendText(msg.roomId, "⚠️ 你没有权限执行此操作");
      return true;
    }

    const targetWxid = text.slice(`${prefix}踢`.length).trim();
    if (!targetWxid) {
      await ctx.hook.sendText(msg.roomId, `用法：${prefix}踢 <成员wxid>`);
      return true;
    }

    try {
      await ctx.hook.kickMember(msg.roomId, targetWxid);
      await ctx.hook.sendText(msg.roomId, `✅ 已将 ${targetWxid} 移出群聊`);
    } catch (err) {
      ctx.logger.error("kickMember failed:", err);
      await ctx.hook.sendText(msg.roomId, `❌ 踢人失败：${String(err)}`);
    }

    return true;
  },
};

export default plugin;
