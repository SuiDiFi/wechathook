import path from "node:path";
import {
  buildHook41827InjectConfig,
  formatRabbitr41955InjectCommand,
  getRabbitr41955Paths,
} from "@wechathook/hook-adapter";
import type { BotConfig, IHookClient } from "@wechathook/shared";
import { createTransport, resolveTransportMode } from "@wechathook/transport";
import { createLogger, loadConfig } from "./config.js";
import { PluginRegistry } from "./plugin-registry.js";
import { SafeHookClient } from "./safe-hook-client.js";
import { SqliteStorage } from "./storage.js";
import { createWebhookApp, startServer } from "./webhook.js";

export interface BotEngineOptions {
  projectRoot: string;
  configPath?: string;
}

export class BotEngine {
  readonly config: BotConfig;
  readonly storage: SqliteStorage;
  readonly hook: IHookClient;
  readonly registry: PluginRegistry;
  readonly transportMode: ReturnType<typeof resolveTransportMode>;
  private logger = createLogger("bot-engine");

  constructor(private options: BotEngineOptions) {
    this.config = loadConfig(options.configPath ?? "config/bot.yaml", options.projectRoot);
    this.storage = new SqliteStorage(this.config.storage.dbPath);
    const transport = createTransport(this.config);
    this.transportMode = transport.mode;
    this.hook = new SafeHookClient(transport.client, this.logger);
    this.registry = new PluginRegistry(this.config, this.hook, this.storage, this.logger);
  }

  async start(): Promise<void> {
    const pluginsDir = path.isAbsolute(this.config.plugins.dir)
      ? this.config.plugins.dir
      : path.join(this.options.projectRoot, this.config.plugins.dir);

    await this.registry.loadFromDirectory(pluginsDir);
    await this.registry.initAll();

    const app = createWebhookApp(this.config, this.registry, this.hook);
    await startServer(app, this.config.bot.port);

    const receiveMode = this.config.hook.receiveMode ?? "http";
    if (receiveMode === "tcp") {
      const { TcpReceiver } = await import("./tcp-receiver.js");
      const tcp = new TcpReceiver(
        { port: this.config.hook.tcpPort ?? 61108, host: this.config.hook.tcpHost ?? "0.0.0.0" },
        this.registry,
      );
      tcp.start();
      this.tcpReceiver = tcp;
    }

    this.logTransportSetup();
    if (this.config.botServer?.relayEnabled) {
      this.logger.info(`Bot-server relay: ${this.config.botServer.url}`);
      this.logger.info("群消息路径: rabbitr -> gateway -> bot-server -> /r/stm");
    }
  }

  private tcpReceiver: { stop(): void } | null = null;

  private logTransportSetup(): void {
    this.logger.info(`Transport mode: ${this.transportMode}`);
    this.logger.info(
      `回调地址: http://127.0.0.1:${this.config.bot.port}${this.config.hook.callbackPath ?? "/api/recvMsg"}`,
    );
    this.logger.info(`Hook API: ${this.config.hook.baseUrl}`);

    if (this.transportMode === "rabbitr41955") {
      const paths = getRabbitr41955Paths(this.config);
      this.logger.info(`Rabbitr Weixin ${paths.wechatVersion}: ${paths.wechatExe}`);
      this.logger.info(`Rabbitr DLL: ${paths.dllPath}`);
      this.logger.info(`Inject 命令: ${formatRabbitr41955InjectCommand(this.config, this.config.bot.port)}`);
      return;
    }

    const injectConfig = buildHook41827InjectConfig(this.config, this.config.bot.port);
    this.logger.info("Hook 4.1.8.27 推荐 inject 配置:");
    this.logger.info(JSON.stringify(injectConfig, null, 2));
  }

  async stop(): Promise<void> {
    this.tcpReceiver?.stop();
    this.storage.close();
  }
}

export { createLogger, loadConfig } from "./config.js";
export { PluginRegistry } from "./plugin-registry.js";
export { SqliteStorage } from "./storage.js";
export { createWebhookApp, startServer } from "./webhook.js";
