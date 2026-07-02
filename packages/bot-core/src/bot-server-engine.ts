import path from "node:path";
import { Hook4xAdapter } from "@wechathook/hook-adapter";
import { PluginConfigLoader } from "@wechathook/plugin-config";
import type { BotConfig } from "@wechathook/shared";
import { createLogger, loadConfig } from "./config.js";
import { PluginRegistry } from "./plugin-registry.js";
import { SafeHookClient } from "./safe-hook-client.js";
import { createSuperApp, startSuperServer } from "./super-server.js";
import { SqliteStorage } from "./storage.js";

export interface BotServerEngineOptions {
  projectRoot: string;
  configPath?: string;
  /** bot-server 端口，默认 8788 */
  port?: number;
}

export class BotServerEngine {
  readonly config: BotConfig;
  readonly storage: SqliteStorage;
  readonly registry: PluginRegistry;
  readonly pluginConfig: PluginConfigLoader;
  private logger = createLogger("bot-server");
  private port: number;

  constructor(private options: BotServerEngineOptions) {
    this.config = loadConfig(options.configPath ?? "config/bot.yaml", options.projectRoot);
    this.port = options.port ?? Number(process.env.BOT_SERVER_PORT ?? 8788);
    this.storage = new SqliteStorage(this.config.storage.dbPath);
    this.pluginConfig = new PluginConfigLoader({ projectRoot: options.projectRoot });

    const noopHook = new SafeHookClient(new Hook4xAdapter({ baseUrl: "http://127.0.0.1:0" }), this.logger);
    this.registry = new PluginRegistry(this.config, noopHook, this.storage, this.logger);
  }

  async start(): Promise<void> {
    const pluginsDir = path.isAbsolute(this.config.plugins.dir)
      ? this.config.plugins.dir
      : path.join(this.options.projectRoot, this.config.plugins.dir);

    await this.registry.loadFromDirectory(pluginsDir);
    await this.registry.initAll();

    const app = createSuperApp({
      config: this.config,
      registry: this.registry,
      storage: this.storage,
      logger: this.logger,
      port: this.port,
      pluginConfig: this.pluginConfig,
    });

    await startSuperServer(app, this.port, this.logger);
    const ops = this.pluginConfig.listAgentOps().length;
    this.logger.info(`Bot server ready — ${ops} agent ops loaded, plugins: ${this.config.plugins.globalEnabled.join(", ")}`);
  }

  async stop(): Promise<void> {
    this.storage.close();
  }
}
