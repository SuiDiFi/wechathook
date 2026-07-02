import type { BotPlugin, MemberJoinEvent, PluginContext } from "@wechathook/shared";

const DEFAULT_WELCOME = "欢迎 {nick} 加入本群！发送 {prefix}帮助 查看可用指令。";

const plugin: BotPlugin = {
  meta: {
    id: "welcome",
    name: "欢迎",
    version: "0.1.0",
  },

  async onMemberJoin(event: MemberJoinEvent, ctx: PluginContext): Promise<void> {
    const groupConfig = ctx.config.groups[event.roomId];
    const template = groupConfig?.welcomeMessage ?? DEFAULT_WELCOME;
    const prefix = ctx.config.bot.commandPrefix;

    const message = template
      .replaceAll("{nick}", event.memberNick)
      .replaceAll("{wxid}", event.memberWxid)
      .replaceAll("{prefix}", prefix);

    await ctx.hook.sendAt(event.roomId, event.memberWxid, message);
    ctx.storage.upsertUser(event.memberWxid, event.memberNick);
  },
};

export default plugin;
