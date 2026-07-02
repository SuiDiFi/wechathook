import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { BotConfig, GroupConfig, TransportMode } from "@wechathook/shared";

interface RawBotConfig {
  transport?: { mode?: TransportMode };
  rabbitr?: {
    dllPath?: string;
    wechatExe?: string;
    wechatVersion?: string;
  };
  hook?: {
    baseUrl?: string;
    webhookSecret?: string;
    receiveMode?: "http" | "tcp";
    callbackPath?: string;
    tcpHost?: string;
    tcpPort?: number;
    httpServerPort?: number;
  };
  bot?: {
    commandPrefix?: string;
    ownerWxids?: string[];
    adminWxids?: string[];
    botWxid?: string;
    allowedRooms?: string[];
    port?: number;
  };
  plugins?: {
    globalEnabled?: string[];
    dir?: string;
  };
  storage?: {
    dbPath?: string;
  };
  groups?: Record<string, GroupConfig>;
  botServer?: {
    url?: string;
    relayEnabled?: boolean;
  };
}

const DEFAULT_CONFIG: BotConfig = {
  hook: {
    baseUrl: "http://127.0.0.1:19088",
    webhookSecret: "",
    receiveMode: "http",
    callbackPath: "/api/recvMsg",
    tcpHost: "0.0.0.0",
    tcpPort: 61108,
    httpServerPort: 19088,
  },
  bot: {
    commandPrefix: "#",
    ownerWxids: [],
    adminWxids: [],
    allowedRooms: [],
    port: 8787,
  },
  plugins: {
    globalEnabled: ["help", "welcome", "checkin"],
    dir: "plugins",
  },
  storage: {
    dbPath: "data/bot.db",
  },
  groups: {},
};

export function loadConfig(configPath: string, projectRoot: string): BotConfig {
  const absPath = path.isAbsolute(configPath)
    ? configPath
    : path.join(projectRoot, configPath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Config file not found: ${absPath}`);
  }

  const raw = yaml.load(fs.readFileSync(absPath, "utf8")) as RawBotConfig;
  const groupsDir = path.join(path.dirname(absPath), "groups");
  const groupConfigs = loadGroupConfigs(groupsDir);

  const config: BotConfig = {
    transport: {
      mode: raw.transport?.mode ?? "hook41827",
    },
    rabbitr: raw.rabbitr
      ? {
          dllPath: raw.rabbitr.dllPath,
          wechatExe: raw.rabbitr.wechatExe,
          wechatVersion: raw.rabbitr.wechatVersion,
        }
      : undefined,
    hook: {
      baseUrl: raw.hook?.baseUrl ?? DEFAULT_CONFIG.hook.baseUrl,
      webhookSecret: raw.hook?.webhookSecret ?? DEFAULT_CONFIG.hook.webhookSecret,
      receiveMode: raw.hook?.receiveMode ?? DEFAULT_CONFIG.hook.receiveMode,
      callbackPath: raw.hook?.callbackPath ?? DEFAULT_CONFIG.hook.callbackPath,
      tcpHost: raw.hook?.tcpHost ?? DEFAULT_CONFIG.hook.tcpHost,
      tcpPort: raw.hook?.tcpPort ?? DEFAULT_CONFIG.hook.tcpPort,
      httpServerPort: raw.hook?.httpServerPort ?? DEFAULT_CONFIG.hook.httpServerPort,
    },
    bot: {
      commandPrefix: raw.bot?.commandPrefix ?? DEFAULT_CONFIG.bot.commandPrefix,
      ownerWxids: raw.bot?.ownerWxids ?? DEFAULT_CONFIG.bot.ownerWxids,
      adminWxids: raw.bot?.adminWxids ?? DEFAULT_CONFIG.bot.adminWxids,
      botWxid: raw.bot?.botWxid,
      allowedRooms: raw.bot?.allowedRooms ?? DEFAULT_CONFIG.bot.allowedRooms,
      port: raw.bot?.port ?? DEFAULT_CONFIG.bot.port,
    },
    plugins: {
      globalEnabled: raw.plugins?.globalEnabled ?? DEFAULT_CONFIG.plugins.globalEnabled,
      dir: raw.plugins?.dir ?? DEFAULT_CONFIG.plugins.dir,
    },
    storage: {
      dbPath: resolvePath(projectRoot, raw.storage?.dbPath ?? DEFAULT_CONFIG.storage.dbPath),
    },
    groups: { ...groupConfigs, ...(raw.groups ?? {}) },
    botServer: raw.botServer?.url
      ? {
          url: raw.botServer.url,
          relayEnabled: raw.botServer.relayEnabled ?? false,
        }
      : undefined,
  };

  return config;
}

export function getGroupsDir(configPath: string, projectRoot: string): string {
  return path.join(path.dirname(resolveConfigPath(configPath, projectRoot)), "groups");
}

function resolveConfigPath(configPath: string, projectRoot: string): string {
  return path.isAbsolute(configPath) ? configPath : path.join(projectRoot, configPath);
}

export function listGroupConfigRoomIds(groupsDir: string): string[] {
  if (!fs.existsSync(groupsDir)) return [];
  return fs
    .readdirSync(groupsDir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => f.replace(/\.(yaml|yml)$/, ""))
    .filter((id) => !id.endsWith(".example"));
}

export function readGroupConfig(groupsDir: string, roomId: string): GroupConfig | null {
  for (const ext of [".yaml", ".yml"]) {
    const file = path.join(groupsDir, `${roomId}${ext}`);
    if (fs.existsSync(file)) {
      return yaml.load(fs.readFileSync(file, "utf8")) as GroupConfig;
    }
  }
  return null;
}

export function saveGroupConfig(groupsDir: string, roomId: string, group: GroupConfig): string {
  fs.mkdirSync(groupsDir, { recursive: true });
  const file = path.join(groupsDir, `${roomId}.yaml`);
  fs.writeFileSync(file, yaml.dump(group, { lineWidth: 120, noRefs: true }), "utf8");
  return file;
}

function loadGroupConfigs(groupsDir: string): Record<string, GroupConfig> {
  if (!fs.existsSync(groupsDir)) return {};

  const result: Record<string, GroupConfig> = {};
  for (const file of fs.readdirSync(groupsDir)) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    const roomId = file.replace(/\.(yaml|yml)$/, "");
    const content = yaml.load(fs.readFileSync(path.join(groupsDir, file), "utf8")) as GroupConfig;
    result[roomId] = content;
  }
  return result;
}

function resolvePath(root: string, target: string): string {
  return path.isAbsolute(target) ? target : path.join(root, target);
}

export function createLogger(scope: string) {
  const prefix = `[${scope}]`;
  return {
    info: (msg: string, ...args: unknown[]) => console.log(prefix, msg, ...args),
    warn: (msg: string, ...args: unknown[]) => console.warn(prefix, msg, ...args),
    error: (msg: string, ...args: unknown[]) => console.error(prefix, msg, ...args),
    debug: (msg: string, ...args: unknown[]) => {
      if (process.env.DEBUG) console.debug(prefix, msg, ...args);
    },
  };
}
