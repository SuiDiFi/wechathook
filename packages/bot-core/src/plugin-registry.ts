import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
  BotConfig,
  BotPlugin,
  IHookClient,
  IStorage,
  Logger,
  MemberJoinEvent,
  MemberLeaveEvent,
  NormalizedMessage,
  PluginContext,
  PluginManifest,
} from "@wechathook/shared";

export interface LoadedPlugin {
  manifest: PluginManifest;
  plugin: BotPlugin;
  dir: string;
}

export class PluginRegistry {
  private plugins = new Map<string, LoadedPlugin>();
  private commandMap = new Map<string, string>();
  private ctx: PluginContext;

  constructor(
    private config: BotConfig,
    hook: IHookClient,
    storage: IStorage,
    logger: Logger,
  ) {
    this.ctx = {
      hook,
      config,
      storage,
      logger,
      isAdmin: (roomId, wxid) => this.isAdmin(roomId, wxid),
      isPluginEnabled: (roomId, pluginId) => this.isPluginEnabled(roomId, pluginId),
      getEnabledPlugins: (roomId) => this.getEnabledPlugins(roomId),
    };
  }

  async loadFromDirectory(pluginsDir: string): Promise<void> {
    if (!fs.existsSync(pluginsDir)) {
      this.ctx.logger.warn(`Plugins directory not found: ${pluginsDir}`);
      return;
    }

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pluginDir = path.join(pluginsDir, entry.name);
      const manifestPath = path.join(pluginDir, "plugin.json");
      if (!fs.existsSync(manifestPath)) {
        this.ctx.logger.warn(`Skip ${entry.name}: missing plugin.json`);
        continue;
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as PluginManifest;
      if (manifest.enabled === false) {
        this.ctx.logger.info(`Skip disabled plugin: ${manifest.id}`);
        continue;
      }

      const mainFile = manifest.main ?? "index.js";
      const mainPath = path.join(pluginDir, mainFile);
      if (!fs.existsSync(mainPath)) {
        this.ctx.logger.warn(`Skip ${manifest.id}: main file not found (${mainFile})`);
        continue;
      }

      const mod = (await import(pathToFileURL(mainPath).href)) as { default?: BotPlugin; plugin?: BotPlugin };
      const plugin = mod.default ?? mod.plugin;
      if (!plugin?.meta?.id) {
        this.ctx.logger.warn(`Skip ${manifest.id}: invalid plugin export`);
        continue;
      }

      this.register({ manifest, plugin, dir: pluginDir });
    }

    this.detectCommandConflicts();
  }

  private register(loaded: LoadedPlugin): void {
    this.plugins.set(loaded.manifest.id, loaded);

    const commands = loaded.plugin.meta.commands ?? loaded.manifest.commands ?? [];
    for (const cmd of commands) {
      this.commandMap.set(cmd, loaded.manifest.id);
    }

    this.ctx.logger.info(`Loaded plugin: ${loaded.manifest.id} v${loaded.manifest.version}`);
  }

  private detectCommandConflicts(): void {
    const seen = new Map<string, string>();
    for (const [cmd, pluginId] of this.commandMap) {
      const prev = seen.get(cmd);
      if (prev && prev !== pluginId) {
        this.ctx.logger.warn(`Command conflict: "${cmd}" registered by both ${prev} and ${pluginId}`);
      }
      seen.set(cmd, pluginId);
    }
  }

  async initAll(): Promise<void> {
    for (const { plugin } of this.plugins.values()) {
      if (plugin.onLoad) {
        await plugin.onLoad(this.ctx);
      }
    }
  }

  getEnabledPlugins(roomId: string): string[] {
    const group = this.config.groups[roomId];
    if (group?.enabledPlugins?.length) {
      return group.enabledPlugins.filter((id) => this.plugins.has(id));
    }
    return this.config.plugins.globalEnabled.filter((id) => this.plugins.has(id));
  }

  isPluginEnabled(roomId: string, pluginId: string): boolean {
    return this.getEnabledPlugins(roomId).includes(pluginId);
  }

  isAdmin(_roomId: string, wxid: string): boolean {
    return (
      this.config.bot.ownerWxids.includes(wxid) ||
      this.config.bot.adminWxids.includes(wxid)
    );
  }

  getPluginCommands(roomId: string): Array<{ pluginId: string; name: string; commands: string[] }> {
    return this.getEnabledPlugins(roomId)
      .map((id) => this.plugins.get(id))
      .filter((p): p is LoadedPlugin => Boolean(p))
      .map(({ manifest, plugin }) => ({
        pluginId: manifest.id,
        name: manifest.name,
        commands: plugin.meta.commands ?? manifest.commands ?? [],
      }));
  }

  async dispatchMessage(msg: NormalizedMessage): Promise<void> {
    if (!this.isRoomAllowed(msg.roomId)) return;
    if (this.isBotMessage(msg)) return;

    this.ctx.storage.upsertUser(msg.senderWxid, msg.senderNick);

    const prefix = this.config.bot.commandPrefix;
    const trimmed = msg.content.trim();
    const isCommand = trimmed.startsWith(prefix);

    if (isCommand) {
      const handled = await this.dispatchCommand(msg, trimmed.slice(prefix.length).trim());
      if (handled) return;
    }

    for (const pluginId of this.getEnabledPlugins(msg.roomId)) {
      const loaded = this.plugins.get(pluginId);
      if (!loaded?.plugin.onMessage) continue;
      const handled = await loaded.plugin.onMessage(msg, this.ctx);
      if (handled) return;
    }
  }

  private async dispatchCommand(msg: NormalizedMessage, commandText: string): Promise<boolean> {
    const [commandRaw, ...rest] = commandText.split(/\s+/);
    const command = commandRaw?.trim();
    if (!command) return false;

    const pluginId = this.commandMap.get(command);
    if (!pluginId || !this.isPluginEnabled(msg.roomId, pluginId)) {
      return false;
    }

    const loaded = this.plugins.get(pluginId);
    if (!loaded?.plugin.onMessage) return false;

    const cmdMsg: NormalizedMessage = {
      ...msg,
      content: `${this.config.bot.commandPrefix}${command}${rest.length ? " " + rest.join(" ") : ""}`,
    };

    return loaded.plugin.onMessage(cmdMsg, this.ctx);
  }

  async dispatchMemberJoin(event: MemberJoinEvent): Promise<void> {
    if (!this.isRoomAllowed(event.roomId)) return;

    for (const pluginId of this.getEnabledPlugins(event.roomId)) {
      const loaded = this.plugins.get(pluginId);
      if (!loaded?.plugin.onMemberJoin) continue;
      await loaded.plugin.onMemberJoin(event, this.ctx);
    }
  }

  async dispatchMemberLeave(event: MemberLeaveEvent): Promise<void> {
    if (!this.isRoomAllowed(event.roomId)) return;

    for (const pluginId of this.getEnabledPlugins(event.roomId)) {
      const loaded = this.plugins.get(pluginId);
      if (!loaded?.plugin.onMemberLeave) continue;
      await loaded.plugin.onMemberLeave(event, this.ctx);
    }
  }

  private isRoomAllowed(roomId: string): boolean {
    const allowed = this.config.bot.allowedRooms;
    return allowed.length === 0 || allowed.includes(roomId);
  }

  private isBotMessage(msg: NormalizedMessage): boolean {
    const botWxid = this.config.bot.botWxid;
    return Boolean(botWxid && msg.senderWxid === botWxid);
  }

  getContext(): PluginContext {
    return this.ctx;
  }
}
